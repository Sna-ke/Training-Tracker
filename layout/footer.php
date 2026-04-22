<?php
// Close the <main> (and .tt-shell if user is logged in)
$_authUser2 = \App\Auth::user();
?>
  </main>
  <?php if ($_authUser2): ?>
</div><!-- /.tt-shell -->
  <?php endif; ?>

<?php if (isset($inlineScript)): ?>
<script><?= $inlineScript ?></script>
<?php endif; ?>

<script src="<?= htmlspecialchars($basePath) ?>public/dist/zone.js"></script>
<?php if (isset($inlineScript)): ?>
<script src="<?= htmlspecialchars($basePath) ?>public/dist/main.js" defer></script>
<?php endif; ?>

</body>
</html>
