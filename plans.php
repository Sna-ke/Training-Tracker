<?php
// ============================================================
//  plans.php — Plan template manager
//  "Plans" are the blueprints; "Journeys" are executions.
// ============================================================
declare(strict_types=1);
require_once __DIR__ . '/app/autoload.php';
use App\Auth;
$currentUser = Auth::require();


use App\Database;
use App\Repositories\{ExerciseRepository, PlanRepository, WorkoutRepository};
use App\Services\TemplateImportService;

$db       = Database::getInstance();
$planRepo = new PlanRepository($db);
$svc      = new TemplateImportService(
    exRepo:      new ExerciseRepository($db),
    workoutRepo: new WorkoutRepository($db),
    planRepo:    $planRepo,
    db:          $db,
);

$message = null; $msgType = 'ok'; $templates = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_FILES['plan_json'])) {
    $file = $_FILES['plan_json'];
    try {
        if ($file['error'] !== UPLOAD_ERR_OK) throw new \RuntimeException('Upload error ' . $file['error']);
        if ($file['size'] > 10 * 1024 * 1024) throw new \RuntimeException('File too large (max 10 MB)');
        $data = json_decode(file_get_contents($file['tmp_name']), true);
        if (!is_array($data)) throw new \InvalidArgumentException('Not valid JSON');
        $result  = $svc->import($data);
        $message = "✓ <strong>" . htmlspecialchars($result['name']) . "</strong> imported — "
                 . "{$result['wt_count']} workout types, {$result['day_count']} days, {$result['media_count']} media links.";
    } catch (\Exception $e) { $message = 'Import failed: ' . htmlspecialchars($e->getMessage()); $msgType = 'err'; }
}

// Handle publish toggle
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['publish_id'])) {
    $publishId = (int)$_POST['publish_id'];
    $nowPublished = !empty($_POST['publish_val']);
    $tpl = $planRepo->findTemplateById($publishId);
    if ($tpl && ($currentUser->isAdmin() || (int)($tpl['created_by'] ?? -1) === $currentUser->id)) {
        $planRepo->setPublished($publishId, $nowPublished);
        header('Location: plans.php?ok=1'); exit;
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['delete_id'])) {
    $delId = (int)$_POST['delete_id'];
    if ($planRepo->templateIsInUse($delId)) {
        $message = 'Cannot delete: active journeys use this plan.'; $msgType = 'err';
    } else {
        $planRepo->deleteTemplate($delId);
        header('Location: plans.php?ok=1'); exit;
    }
}

if (!$message && isset($_GET['ok'])) { $message = 'Plan deleted.'; }

try { $templates = $planRepo->findAllTemplates($currentUser->isAdmin() ? null : $currentUser->id); } catch (\Exception $e) { $dbError = htmlspecialchars($e->getMessage()); }

$pageTitle      = 'Plans';
require __DIR__ . '/layout/header.php';
?>

<div class="page-header">
  <div>
    <p class="page-eyebrow">Training Tracker</p>
    <h1 class="page-title">Plans</h1>
  </div>
  <a href="builder.php" class="btn btn-primary">🔨 Build a Plan</a>
</div>

<div class="page-body">

  <?php if (!empty($dbError)): ?><div class="dberr">⚠ <?= $dbError ?></div><?php endif; ?>

  <?php if ($message): ?>
  <div style="border-radius:var(--rs);padding:.85rem;margin-bottom:.9rem;font-size:.8rem;line-height:1.5;
    <?= $msgType==='ok'?'background:#f0fdf4;border:1px solid #86efac;color:#166534':'background:#fef2f2;border:1px solid #fecaca;color:#991b1b' ?>">
    <?= $message ?>
  </div>
  <?php endif; ?>

  <!-- Upload -->
  <?php if ($currentUser->isAdmin()): ?>
  <div style="font-size:.6rem;color:var(--t4);letter-spacing:.18em;text-transform:uppercase;margin-bottom:.6rem">Upload Plan from JSON</div>
  <form method="POST" enctype="multipart/form-data">
    <div class="upload-zone" id="drop-zone" onclick="document.getElementById('file-in').click()">
      <div style="font-size:1.8rem;margin-bottom:.5rem">📋</div>
      <div style="font-size:.82rem;color:var(--t2);margin-bottom:.2rem">Drop a plan JSON here, or tap to browse</div>
      <div style="font-size:.65rem;color:var(--t4)">Max 10 MB · .json only</div>
      <input type="file" id="file-in" name="plan_json" accept=".json" onchange="fileChosen(this)">
      <div id="chosen-name" style="font-size:.72rem;color:var(--c2);margin-top:.5rem;min-height:1.2em"></div>
    </div>
    <button type="submit" id="import-btn" style="display:none;width:100%;margin-top:.5rem;background:var(--c2);color:#fff;font-weight:700;border:none;border-radius:var(--rs);padding:.75rem;font-size:.85rem;min-height:48px;cursor:pointer">Import Plan</button>
  </form>

  <div style="text-align:center;margin:.75rem 0;font-size:.68rem;color:var(--t4)">— or —</div>
  <a href="builder.php" style="display:flex;align-items:center;justify-content:center;gap:.5rem;background:#fff;border:2px dashed #cbd5e1;border-radius:var(--rs);padding:.7rem;font-size:.82rem;color:var(--t2);text-decoration:none;min-height:46px;margin-bottom:1.25rem">
    🔨 Build a Plan from Scratch
  </a>
  <?php endif; /* admin */ ?>
  <!-- All users can build their own custom plans -->
  <?php if (!$currentUser->isAdmin()): ?>
  <a href="builder.php" style="display:flex;align-items:center;justify-content:center;gap:.5rem;background:#fff;border:2px dashed #cbd5e1;border-radius:var(--rs);padding:.7rem;font-size:.82rem;color:var(--t2);text-decoration:none;min-height:46px;margin-bottom:1.25rem">
    ✏️ Build My Own Plan
  </a>
  <?php endif; ?>

  <!-- Plan list -->
  <div style="font-size:.6rem;color:var(--t4);letter-spacing:.18em;text-transform:uppercase;margin-bottom:.6rem">
    Installed Plans (<?= count($templates) ?>)
  </div>

  <?php if (empty($templates)): ?>
  <div style="text-align:center;padding:2rem;background:var(--bg2);border:1px solid var(--bd);border-radius:var(--r);color:var(--t3);font-size:.82rem;line-height:1.7">
    No plans yet. Upload <strong>sub20_5k.json</strong> or build one.
  </div>
  <?php else: ?>
  <?php foreach ($templates as $t): ?>
  <div class="card" style="margin-bottom:.5rem">
    <div style="padding:.85rem;display:flex;justify-content:space-between;align-items:flex-start;gap:.5rem">
      <div style="flex:1;min-width:0">
        <div style="font-size:.9rem;color:var(--tx);margin-bottom:.25rem"><?= htmlspecialchars($t['name']) ?></div>
        <div style="font-size:.65rem;color:var(--t3);margin-bottom:.45rem">Added <?= date('M j, Y', strtotime($t['created_at'])) ?></div>
        <div style="display:flex;gap:.5rem;flex-wrap:wrap">
          <span class="tpl-stat"><?= (int)$t['total_weeks'] ?> weeks</span>
          <span class="tpl-stat"><?= (int)$t['day_count'] ?> days</span>
          <span class="tpl-stat"><?= (int)$t['wt_count'] ?> workout types</span>
          <?php if (empty($t['created_by'])): ?>
            <span class="tpl-stat" style="color:#1d4ed8;background:#eff6ff;border:1px solid #bfdbfe;border-radius:20px;font-size:.65rem;padding:2px 8px">🌍 Global Default</span>
          <?php elseif (!empty($t['is_published'])): ?>
            <span class="tpl-stat" style="color:#166534;background:#f0fdf4;border:1px solid #86efac;border-radius:20px;font-size:.65rem;padding:2px 8px">📢 Published</span>
          <?php else: ?>
            <span class="tpl-stat" style="color:#64748b;background:#f8fafc;border:1px solid #cbd5e1;border-radius:20px;font-size:.65rem;padding:2px 8px">🔒 Private Draft</span>
          <?php endif; ?>
        </div>
        <?php if (!empty($t['description'])): ?>
        <details style="margin-top:.5rem">
          <summary style="font-size:.65rem;color:var(--t4);cursor:pointer">Description ▸</summary>
          <p style="font-size:.7rem;color:var(--t4);line-height:1.6;margin-top:.3rem"><?= htmlspecialchars($t['description']) ?></p>
        </details>
        <?php endif; ?>
      </div>
      <div style="display:flex;flex-direction:column;gap:.35rem;flex-shrink:0">
        <a href="plan_editor.php?template_id=<?= $t['id'] ?>" class="btn btn-ghost" style="font-size:.72rem;padding:.4rem .75rem;min-height:36px;white-space:nowrap">✏️ Edit</a>
        <?php if (!empty($t['created_by']) && ((int)$t['created_by'] === $currentUser->id || $currentUser->isAdmin())): ?>
        <form method="POST" style="margin:0">
          <input type="hidden" name="publish_id" value="<?= $t['id'] ?>">
          <input type="hidden" name="publish_val" value="<?= empty($t['is_published']) ? '1' : '' ?>">
          <button type="submit" class="btn btn-ghost" style="font-size:.68rem;padding:.3rem .6rem;min-height:32px;white-space:nowrap">
            <?= empty($t['is_published']) ? '📢 Publish' : '🔒 Unpublish' ?>
          </button>
        </form>
        <?php endif; ?>
        <form method="POST" style="margin:0" onsubmit="return confirm('Delete this plan? Active journeys using it will break.')">
          <input type="hidden" name="delete_id" value="<?= $t['id'] ?>">
          <button type="submit" class="btn btn-danger" style="width:100%;padding:.3rem .6rem;min-height:32px">✕ Delete</button>
        </form>
      </div>
    </div>
  </div>
  <?php endforeach; ?>
  <?php endif; ?>

  <div style="background:var(--bg2);border:1px solid var(--bd);border-radius:var(--r);padding:.9rem;margin-top:1.25rem">
    <div style="font-size:.6rem;color:var(--t4);letter-spacing:.12em;text-transform:uppercase;margin-bottom:.5rem">JSON Format</div>
    <div style="font-size:.72rem;color:var(--t3);line-height:1.7">
      Required keys: <code style="background:var(--bg3);padding:1px 5px;border-radius:3px">template</code>,
      <code style="background:var(--bg3);padding:1px 5px;border-radius:3px">exercises</code>,
      <code style="background:var(--bg3);padding:1px 5px;border-radius:3px">workout_types</code>,
      <code style="background:var(--bg3);padding:1px 5px;border-radius:3px">weeks</code>.<br>
      Exercises upsert by slug — re-uploading won't duplicate them. Each exercise can include a
      <code style="background:var(--bg3);padding:1px 5px;border-radius:3px">media</code> array.
    </div>
  </div>

</div><!-- /content -->
<script>
function fileChosen(i){ if(!i.files.length)return; document.getElementById('chosen-name').textContent='📄 '+i.files[0].name; document.getElementById('import-btn').style.display='block'; }
(function(){
  const z=document.getElementById('drop-zone');
  z.addEventListener('dragover',e=>{e.preventDefault();z.classList.add('drag');});
  z.addEventListener('dragleave',()=>z.classList.remove('drag'));
  z.addEventListener('drop',e=>{e.preventDefault();z.classList.remove('drag');const f=e.dataTransfer.files[0];if(!f?.name.endsWith('.json'))return;const dt=new DataTransfer();dt.items.add(f);document.getElementById('file-in').files=dt.files;fileChosen(document.getElementById('file-in'));});
})();
</script>
<?php require __DIR__ . '/layout/footer.php'; ?>
