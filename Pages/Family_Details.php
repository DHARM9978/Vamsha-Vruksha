<?php
include "conn.php";
require "Navbar.php";

/* =========================================================
   ROOT PERSON DETECTION (UNCHANGED)
========================================================= */

$rootPerson = null;

if (isset($_GET['person']) && is_numeric($_GET['person'])) {

    $selected = intval($_GET['person']);

    $stmt = $conn->prepare("SELECT Family_Id FROM PERSON WHERE Person_Id=?");
    $stmt->bind_param("i", $selected);
    $stmt->execute();
    $res = $stmt->get_result();
    $row = $res->fetch_assoc();

    if ($row && $row['Family_Id']) {
        $familyId = $row['Family_Id'];

        $stmt = $conn->prepare("SELECT Person_Id FROM PERSON WHERE Family_Id=? ORDER BY Person_Id ASC LIMIT 1");
        $stmt->bind_param("i", $familyId);
        $stmt->execute();
        $headRes = $stmt->get_result();
        $headRow = $headRes->fetch_assoc();

        if ($headRow) {
            $rootPerson = $headRow['Person_Id'];
        }
    }
}

if (isset($_GET['family']) && is_numeric($_GET['family'])) {

    $familyId = intval($_GET['family']);

    $stmt = $conn->prepare("SELECT Person_Id FROM PERSON WHERE Family_Id=? ORDER BY Person_Id ASC LIMIT 1");
    $stmt->bind_param("i", $familyId);
    $stmt->execute();
    $headRes = $stmt->get_result();
    $headRow = $headRes->fetch_assoc();

    if ($headRow) {
        $rootPerson = $headRow['Person_Id'];
    }
}

/* =========================================================
   HELPER FUNCTIONS (UNCHANGED)
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

    if($mother=='-' && $fatherId){
        $stmt=$conn->prepare("
            SELECT p.First_Name
            FROM FAMILY_RELATION fr
            JOIN PERSON p ON 
            ((fr.Person_Id=? AND p.Person_Id=fr.Related_Person_Id)
            OR
            (fr.Related_Person_Id=? AND p.Person_Id=fr.Person_Id))
            WHERE fr.Relation_Type IN ('Husband-Wife','Wife-Husband')
            LIMIT 1
        ");
        $stmt->bind_param("ii",$fatherId,$fatherId);
        $stmt->execute();
        $r2=$stmt->get_result();
        if($r2 && $r2->num_rows){
            $mother=$r2->fetch_assoc()['First_Name'];
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

function displayGeneration($personId,$conn,$level=1,&$counter=1){

    $children=getChildren($personId,$conn);

    foreach($children as $child){

        $spouse=getSpouse($child['Person_Id'],$conn);

        $spouseFather='-'; 
        $spouseMother='-';
        $spouseNative='-';
        $spouseGothra='-';

        if($spouse){
            list($spouseFather,$spouseMother)=getParents($spouse['Person_Id'],$conn);
            $spouseNative=$spouse['Original_Native'] ?? '-';

            $g=$conn->query("SELECT g.Gotra_Name FROM Gothra g 
                             JOIN PERSON p ON p.Gotra_Id=g.Gotra_Id 
                             WHERE p.Person_Id=".$spouse['Person_Id']);
            if($g && $g->num_rows){
                $spouseGothra=$g->fetch_assoc()['Gotra_Name'];
            }
        }

        $padding=30*$level;

        echo "<tr>";
        echo "<td style='padding-left:{$padding}px;'>";
        if($level==1) echo $counter++.". ";
        echo htmlspecialchars($child['First_Name']." ".$child['Last_Name']);
        echo "</td>";

        echo "<td>";
        if($spouse){
            echo "<a href='?person=".$spouse['Person_Id']."' class='spouse-link'>"
                 .htmlspecialchars($spouse['First_Name'])."</a>";
        } else echo "-";
        echo "</td>";

        echo "<td>".$spouseNative."</td>";
        echo "<td>".$spouseGothra."</td>";
        echo "<td>".$spouseFather."</td>";
        echo "<td>".$spouseMother."</td>";
        echo "</tr>";

        displayGeneration($child['Person_Id'],$conn,$level+1,$counter);
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

<style>
    /* ===========================================
   🌿 VAMSHA VRUKSHA - FAMILY VIEW (PRO UI)
=========================================== */

:root {
    --primary-blue: #2563eb;
    --primary-green: #16a34a;
    --light-blue: #e0f2fe;
    --light-green: #ecfdf5;
    --soft-bg: #f8fafc;
    --border: #e2e8f0;
    --text-dark: #1e293b;
}

*{
    box-sizing:border-box;
}

body {
    margin: 0;
    font-family: "Segoe UI", system-ui;
    background: linear-gradient(135deg, var(--light-blue), #f0f9ff, var(--light-green));
    color: var(--text-dark);
    min-height:100vh;
}

/* ===== Page Wrapper ===== */
.page-wrapper {
    max-width: 1200px;
    margin: auto;
    padding: 120px 20px 60px;
}

/* ===== Glass Card ===== */
.glass-card {
    background: rgba(255, 255, 255, .92);
    backdrop-filter: blur(18px);
    border-radius: 24px;
    padding: clamp(25px,4vw,50px);
    margin-bottom: 40px;
    box-shadow: 0 25px 70px rgba(0, 0, 0, .08);
    transition: .3s;
}

.glass-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 30px 80px rgba(0, 0, 0, .12);
}

/* ===== Headings ===== */
h2 {
    text-align: center;
    margin-bottom: 30px;
    font-size: clamp(20px,4vw,30px);
    background: linear-gradient(90deg, var(--primary-blue), var(--primary-green));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

h3 {
    margin-top: 30px;
    margin-bottom: 15px;
    color: var(--primary-blue);
}

/* ===== Search ===== */
.search-box {
    display:flex;
    justify-content:center;
    gap:12px;
    flex-wrap:wrap;
}

.search-box input {
    flex:1;
    min-width:220px;
    max-width:500px;
    padding:14px;
    border-radius:16px;
    border:1px solid var(--border);
    background:var(--soft-bg);
    transition:.3s;
}

.search-box input:focus {
    border-color: var(--primary-blue);
    box-shadow: 0 0 0 3px rgba(37, 99, 235, .15);
    outline: none;
    background:white;
}

.search-box button {
    padding:14px 24px;
    border:none;
    border-radius:16px;
    background:linear-gradient(135deg,var(--primary-blue),var(--primary-green));
    color:white;
    font-weight:600;
    cursor:pointer;
    transition:.3s;
}

.search-box button:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 25px rgba(37, 99, 235, .3);
}

/* ===== Family Links ===== */
.family-link {
    display:block;
    padding:16px;
    border-radius:18px;
    background:white;
    margin-bottom:14px;
    text-decoration:none;
    color:var(--text-dark);
    font-weight:600;
    transition:.3s;
}

.family-link:hover {
    transform:translateY(-3px);
    box-shadow:0 12px 28px rgba(37,99,235,.2);
}

/* ===== Table ===== */
.table-wrapper{
    overflow-x:auto;
    border-radius:18px;
}

table {
    width:100%;
    min-width:800px;
    border-collapse:collapse;
    background:white;
    border-radius:18px;
    overflow:hidden;
}

th {
    background:linear-gradient(90deg,#eff6ff,#e0f2fe);
    padding:14px;
    text-align:left;
    color:var(--primary-blue);
}

td {
    padding:12px;
    border-bottom:1px solid #f1f5f9;
    font-size:14px;
}

tr:hover td {
    background:#f8fafc;
}

/* ===== Spouse Link ===== */
.spouse-link {
    color:var(--primary-blue);
    font-weight:600;
    text-decoration:none;
}

.spouse-link:hover {
    color:var(--primary-green);
    text-decoration:underline;
}

/* ===== Head Info Grid ===== */
.head-horizontal {
    display:grid;
    grid-template-columns:repeat(auto-fit,minmax(200px,1fr));
    gap:20px;
    padding:25px;
    margin-bottom:30px;
    background:linear-gradient(90deg,#eff6ff,#f0fdf4);
    border-radius:20px;
}

.head-horizontal span {
    display:block;
    font-weight:600;
    color:#2563eb;
    margin-bottom:6px;
}

/* ===== Export Button ===== */
.export-wrapper {
    display:flex;
    justify-content:center;
    margin:30px 0;
}

.export-btn {
    padding:14px 30px;
    border:none;
    border-radius:20px;
    background:linear-gradient(135deg,var(--primary-blue),var(--primary-green));
    color:white;
    font-weight:600;
    font-size:15px;
    cursor:pointer;
    transition:.3s;
}

.export-btn:hover {
    transform:translateY(-2px);
    box-shadow:0 14px 30px rgba(37,99,235,.3);
}

/* ===== Responsive ===== */
@media(max-width:768px){

    .glass-card{
        padding:22px;
        border-radius:20px;
    }

    table{
        min-width:700px;
    }

    .glass-card:hover{
        transform:none;
    }
}

@media(max-width:480px){

    .page-wrapper{
        padding:100px 15px 40px;
    }

    h2{
        font-size:18px;
    }

    .search-box{
        flex-direction:column;
        align-items:stretch;
    }

    .search-box button{
        width:100%;
    }
}

</style>

<div class="page-wrapper">

    <?php if(!$rootPerson): ?>

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
$head=$conn->query("
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
WHERE p.Person_Id=$rootPerson
")->fetch_assoc();


$spouse=getSpouse($head['Person_Id'],$conn);
?>

    <div class="glass-card">


        <br>
        <br>
        <div id="familyContent">

            <h2><?= htmlspecialchars($head['First_Name']." ".$head['Last_Name']) ?> Family</h2>

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
                    <td><?= $spouse ? htmlspecialchars($spouse['First_Name']) : '-' ?></td>
                    <td>-</td>
                    <td>-</td>
                    <td>-</td>
                    <td>-</td>
                </tr>

                <?php
$i=1;
displayGeneration($head['Person_Id'],$conn,1,$i);
?>

            </table>
            <br>

        </div> <!-- End familyContent -->
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



<script>
async function printFamily() {

    const {
        jsPDF
    } = window.jspdf;
    const content = document.getElementById("familyContent");

    // Temporarily fix gradient text issue
    const headings = content.querySelectorAll("h2");
    headings.forEach(h => {
        h.style.background = "none";
        h.style.webkitTextFillColor = "black";
        h.style.color = "black";
    });

    const canvas = await html2canvas(content, {
        scale: 2,
        useCORS: true
    });

    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF('p', 'mm', 'a4');

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pdfHeight;

    while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
    }

    pdf.save("Family_Details.pdf");

    // Optional: reload to restore gradient styling
    location.reload();
}
</script>