<?php

include "auth_check.php";

if($_SESSION['role']!="Admin"){
header("Location: Family_tree.php");
exit();
}

?>