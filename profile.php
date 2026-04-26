<?php
// ============================================================
//  profile.php — backward-compatibility redirect
//  The profile editor moved to user/edit_profile.php
// ============================================================
header('Location: user/edit_profile.php', true, 301);
exit;
