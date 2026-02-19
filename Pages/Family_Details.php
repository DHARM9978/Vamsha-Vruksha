<?php
include "conn.php";
require "Navbar.php";
/* =========================================================
   ROOT PERSON DETECTION (FINAL CORRECT VERSION)
========================================================= */

$rootPerson = null;
$familyId = null;

if (isset($_GET['person']) && is_numeric($_GET['person'])) {

    $selected = intval($_GET['person']);

    // 🔥 First get the family of searched person
    $stmt = $conn->prepare("SELECT Family_Id FROM PERSON WHERE Person_Id=?");
    $stmt->bind_param("i", $selected);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();

    if ($row && $row['Family_Id']) {
        $familyId = $row['Family_Id'];

        // 🔥 ALWAYS get oldest person as HEAD
        $stmt = $conn->prepare("
            SELECT Person_Id 
            FROM PERSON 
            WHERE Family_Id=? 
            ORDER BY Person_Id ASC 
            LIMIT 1
        ");
        $stmt->bind_param("i", $familyId);
        $stmt->execute();
        $rootPerson = $stmt->get_result()->fetch_assoc()['Person_Id'] ?? null;
    }
}

if (isset($_GET['family']) && is_numeric($_GET['family'])) {

    $familyId = intval($_GET['family']);

    $stmt = $conn->prepare("
        SELECT Person_Id 
        FROM PERSON 
        WHERE Family_Id=? 
        ORDER BY Person_Id ASC 
        LIMIT 1
    ");
    $stmt->bind_param("i", $familyId);
    $stmt->execute();
    $rootPerson = $stmt->get_result()->fetch_assoc()['Person_Id'] ?? null;
}

/* =========================================================
   HELPER FUNCTIONS
========================================================= */

function getSpouse($id, $conn){
    $stmt = $conn->prepare("
        SELECT p.*
        FROM FAMILY_RELATION fr
        JOIN PERSON p ON 
        ((fr.Person_Id=? AND p.Person_Id=fr.Related_Person_Id)
        OR
        (fr.Related_Person_Id=? AND p.Person_Id=fr.Person_Id))
        WHERE fr.Relation_Type IN ('Husband-Wife','Wife-Husband')
        LIMIT 1
    ");
    $stmt->bind_param("ii",$id,$id);
    $stmt->execute();
    $r=$stmt->get_result();
    return ($r && $r->num_rows)?$r->fetch_assoc():null;
}

function getParents($id,$conn){
    $fatherId = null;
    $father = '-';
    $mother = '-';

    $stmt=$conn->prepare("
        SELECT p.Person_Id, p.First_Name, fr.Relation_Type
        FROM FAMILY_RELATION fr
        JOIN PERSON p ON p.Person_Id =
        CASE 
            WHEN fr.Person_Id=? THEN fr.Related_Person_Id
            ELSE fr.Person_Id
        END
        WHERE (fr.Person_Id=? AND fr.Relation_Type IN ('Father','Mother'))
           OR (fr.Related_Person_Id=? AND fr.Relation_Type IN ('Son','Daughter'))
    ");

    $stmt->bind_param("iii",$id,$id,$id);
    $stmt->execute();
    $r=$stmt->get_result();

    while($row=$r->fetch_assoc()){
        if($row['Relation_Type']=='Father'){
            $father=$row['First_Name'];
            $fatherId=$row['Person_Id'];
        }
        if($row['Relation_Type']=='Mother'){
            $mother=$row['First_Name'];
        }
    }

    return [$father,$mother];
}

function getChildren($id,$conn){
    $list=[];
    $stmt=$conn->prepare("
        SELECT DISTINCT p.*
        FROM FAMILY_RELATION fr
        JOIN PERSON p ON
        ((fr.Person_Id=? AND fr.Relation_Type IN ('Son','Daughter') AND p.Person_Id=fr.Related_Person_Id)
        OR
        (fr.Related_Person_Id=? AND fr.Relation_Type IN ('Father','Mother') AND p.Person_Id=fr.Person_Id))
    ");
    $stmt->bind_param("ii",$id,$id);
    $stmt->execute();
    $r=$stmt->get_result();
    while($row=$r->fetch_assoc()) $list[]=$row;
    return $list;
}

function getSiblings($id,$conn){

    $siblings=[];

    $stmt=$conn->prepare("
        SELECT DISTINCT p.*
        FROM FAMILY_RELATION fr
        JOIN PERSON p ON
        ((fr.Person_Id=? AND fr.Relation_Type IN ('Brother','Sister') AND p.Person_Id=fr.Related_Person_Id)
        OR
        (fr.Related_Person_Id=? AND fr.Relation_Type IN ('Brother','Sister') AND p.Person_Id=fr.Person_Id))
    ");

    $stmt->bind_param("ii",$id,$id);
    $stmt->execute();
    $r=$stmt->get_result();

    while($row=$r->fetch_assoc()) $siblings[]=$row;

    return $siblings;
}


function getGotraName($id,$conn){
    if(!$id) return "-";
    $stmt=$conn->prepare("SELECT Gotra_Name FROM Gothra WHERE Gotra_Id=?");
    $stmt->bind_param("i",$id);
    $stmt->execute();
    $r=$stmt->get_result();
    return ($r && $r->num_rows)?$r->fetch_assoc()['Gotra_Name']:"-";
}

function displayGeneration($personId,$conn,$rootFamily,$level=1,&$counter=1){

    $children=getChildren($personId,$conn);

    foreach($children as $child){

        $spouse=getSpouse($child['Person_Id'],$conn);

        $spouseFather='-'; 
        $spouseMother='-';
        $spouseNative='-';
        $spouseGothra='-';

        if($spouse){
            $spouseFather = $spouse['father_name'] ?? '-';
            $spouseMother = $spouse['mother_name'] ?? '-';
            $spouseNative = $spouse['Original_Native'] ?? '-';
            $spouseGothra = getGotraName($spouse['Gotra_Id'],$conn);
        }

        $padding=30*$level;

        echo "<tr>";
        echo "<td style='padding-left:{$padding}px;'>";
        if($level==1) echo $counter++.". ";
        echo htmlspecialchars($child['First_Name']." ".$child['Last_Name']);
        echo "</td>";

        echo "<td>";
        if($spouse){
            if($spouse['Family_Id'] != $rootFamily){
                echo "<a href='?person=".$spouse['Person_Id']."' class='spouse-link'>"
                     .htmlspecialchars($spouse['First_Name'])."</a>";
            } else {
                echo htmlspecialchars($spouse['First_Name']);
            }
        } else echo "-";
        echo "</td>";

        echo "<td>".$spouseNative."</td>";
        echo "<td>".$spouseGothra."</td>";
        echo "<td>".$spouseFather."</td>";
        echo "<td>".$spouseMother."</td>";
        echo "</tr>";

        displayGeneration($child['Person_Id'],$conn,$rootFamily,$level+1,$counter);
    }
}

/* ================= SEARCH ================= */

$results=null;
if(isset($_GET['q']) && trim($_GET['q'])!=''){
    $s="%".$_GET['q']."%";
    $stmt=$conn->prepare("
        SELECT Person_Id, First_Name, Last_Name 
        FROM PERSON 
        WHERE First_Name LIKE ? OR Last_Name LIKE ?
    ");
    $stmt->bind_param("ss",$s,$s);
    $stmt->execute();
    $results=$stmt->get_result();
}

$familyList=$conn->query("SELECT Family_Id,Family_Name FROM FAMILY ORDER BY Family_Name ASC");
?>

<link rel="stylesheet" href="../CSS/family_details.css">
<script src="../JavaScript/Show_Family_Details_Functions.js"></script>

<div class="page-wrapper">

    <?php if(!$rootPerson): ?>

    <!-- SEARCH SECTION -->

    <div class="glass-card">
        <h2>Search Person and get Family Details</h2>
        <form class="search-box">
            <input name="q" placeholder="Search person..." required>
            <button>Search</button>
        </form>

        <?php if($results): ?>
        <?php while($p=$results->fetch_assoc()): ?>
        <div style="text-align:center;">
            <a href="?person=<?= $p['Person_Id'] ?>" class="result-link">
                <?= htmlspecialchars($p['First_Name']." ".$p['Last_Name']) ?>
            </a>
        </div>
        <?php endwhile; ?>
        <?php endif; ?>
    </div>

    <div class="glass-card">
        <h2>All Families</h2>
        <?php while($fam=$familyList->fetch_assoc()): ?>
        <a class="family-link" href="?family=<?= $fam['Family_Id'] ?>">
            <?= htmlspecialchars($fam['Family_Name']) ?> (ID: <?= $fam['Family_Id'] ?>)
        </a>
        <?php endwhile; ?>
    </div>

    <?php else: ?>

    <?php
$stmt = $conn->prepare("
SELECT p.*, 
       g.Gotra_Name, 
       s.Sutra_Name, 
       v.Vamsha_Name,
       ps.Panchang_Sudhi_Name,
       kd.Kula_Devatha_Name,
       md.Mane_Devru_Name,
       pv.Pooja_Vruksha_Name
FROM PERSON p
LEFT JOIN Gothra g ON p.Gotra_Id=g.Gotra_Id
LEFT JOIN Sutra s ON p.Sutra_Id=s.Sutra_Id
LEFT JOIN Vamsha v ON p.Vamsha_Id=v.Vamsha_Id
LEFT JOIN Panchang_Sudhi ps ON p.Panchang_Sudhi_Id=ps.Panchang_Sudhi_Id
LEFT JOIN Kula_Devatha kd ON p.Kula_Devatha_Id=kd.Kula_Devatha_Id
LEFT JOIN Mane_Devru md ON p.Mane_Devru_Id=md.Mane_Devru_Id
LEFT JOIN Pooja_Vruksha pv ON p.Pooja_Vruksha_Id=pv.Pooja_Vruksha_Id
WHERE p.Person_Id=?
");

$stmt->bind_param("i",$rootPerson);
$stmt->execute();
$head=$stmt->get_result()->fetch_assoc();

$spouse=getSpouse($head['Person_Id'],$conn);
?>

    <div class="glass-card">

        <br><br>

        <div id="familyContent">

            <h2><?= htmlspecialchars($head['First_Name']." ".$head['Last_Name']) ?> Family Branch</h2>


            <!-- HEAD HORIZONTAL SECTION -->

            <div class="head-horizontal">

                <div>
                    <span>Head</span>
                    <?= htmlspecialchars($head['First_Name']." ".$head['Last_Name']) ?>
                </div>

                <div>
                    <span>Spouse</span>
                    <?= $spouse ? htmlspecialchars($spouse['First_Name']) : '-' ?>
                </div>

                <div>
                    <span>Native</span>
                    <?= $head['Original_Native'] ?? '-' ?>
                </div>

                <div>
                    <span>Gothra</span>
                    <?= $head['Gotra_Name'] ?? '-' ?>
                </div>

                <div>
                    <span>Sutra</span>
                    <?= $head['Sutra_Name'] ?? '-' ?>
                </div>

                <div>
                    <span>Vamsha</span>
                    <?= $head['Vamsha_Name'] ?? '-' ?>
                </div>

                <div>
                    <span>Panchang Sudhi</span>
                    <?= $head['Panchang_Sudhi_Name'] ?? '-' ?>
                </div>

                <div>
                    <span>Kula Devatha</span>
                    <?= $head['Kula_Devatha_Name'] ?? '-' ?>
                </div>

                <div>
                    <span>Mane Devru</span>
                    <?= $head['Mane_Devru_Name'] ?? '-' ?>
                </div>

                <div>
                    <span>Pooja Vruksha</span>
                    <?= $head['Pooja_Vruksha_Name'] ?? '-' ?>
                </div>

            </div>

            <h3>Family Hierarchy</h3>

            <div class="table-wrapper">
                <table>
                    <tr>
                        <th>Name</th>
                        <th>Spouse</th>
                        <th>Spouse Native</th>
                        <th>Spouse Gothra</th>
                        <th>Spouse Father</th>
                        <th>Spouse Mother</th>
                    </tr>

                    <tr>
                        <td><b><?= htmlspecialchars($head['First_Name'].' '.$head['Last_Name']) ?></b></td>

                        <!-- 🔥 UPDATED SPOUSE LOGIC -->
                        <td>
                            <?php if($spouse): ?>
                            <?php if($spouse['Family_Id'] != $head['Family_Id']): ?>
                            <a href="?person=<?= $spouse['Person_Id'] ?>" class="spouse-link">
                                <?= htmlspecialchars($spouse['First_Name']) ?>
                            </a>
                            <?php else: ?>
                            <?= htmlspecialchars($spouse['First_Name']) ?>
                            <?php endif; ?>
                            <?php else: ?>-<?php endif; ?>
                        </td>

                        <td><?= htmlspecialchars($spouse['Original_Native'] ?? '-') ?></td>
                        <td><?= htmlspecialchars(getGotraName($spouse['Gotra_Id'] ?? null,$conn)) ?></td>
                        <td><?= htmlspecialchars($spouse['father_name'] ?? '-') ?></td>
                        <td><?= htmlspecialchars($spouse['mother_name'] ?? '-') ?></td>
                    </tr>

                    <?php

// 🔥 Head's Children
$i = 1;
displayGeneration(
    $head['Person_Id'],
    $conn,
    $head['Family_Id'],
    1,
    $i
);

// 🔥 Get Head's Siblings
$siblings = getSiblings($head['Person_Id'],$conn);

if(!empty($siblings)){

    foreach($siblings as $sib){

        echo "<tr>";
        echo "<td style='padding-left:0px;'><b>"
             .htmlspecialchars($sib['First_Name']." ".$sib['Last_Name'])
             ."</b></td>";

        $spouse = getSpouse($sib['Person_Id'],$conn);

        echo "<td>";
        if($spouse){
            if($spouse['Family_Id'] != $head['Family_Id']){
                echo "<a href='?person=".$spouse['Person_Id']."' class='spouse-link'>"
                     .htmlspecialchars($spouse['First_Name'])."</a>";
            } else {
                echo htmlspecialchars($spouse['First_Name']);
            }
        } else echo "-";
        echo "</td>";

        echo "<td>".htmlspecialchars($spouse['Original_Native'] ?? '-')."</td>";
        echo "<td>".htmlspecialchars(getGotraName($spouse['Gotra_Id'] ?? null,$conn))."</td>";
        echo "<td>".htmlspecialchars($spouse['father_name'] ?? '-')."</td>";
        echo "<td>".htmlspecialchars($spouse['mother_name'] ?? '-')."</td>";
        echo "</tr>";

        // 🔥 Reset counter for this sibling branch
        $siblingCounter = 1;

        displayGeneration(
            $sib['Person_Id'],
            $conn,
            $head['Family_Id'],
            1,
            $siblingCounter
        );
    }
}
?>


                </table>
            </div>

            <br>

        </div>

        <!-- PDF EXPORT BUTTON -->

        <div class="export-wrapper">
            <button onclick="printFamily()" class="export-btn">
                Download PDF
            </button>
        </div>

    </div>

    <?php endif; ?>

</div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>


<!-- PDF LIBRARIES -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>

