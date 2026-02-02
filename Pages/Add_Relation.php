<?php
// ---------- AJAX HANDLER ----------
if (isset($_POST['action'])) {
    include "conn.php";
    header('Content-Type: application/json');

    if ($_POST['action'] == 'searchFamily') {
        $q = "%".$_POST['family']."%";
        $stmt = $conn->prepare("SELECT Family_Id, Family_Name FROM FAMILY WHERE Family_Name LIKE ?");
        $stmt->bind_param("s",$q);
        $stmt->execute();
        $res = $stmt->get_result();

        $data=[];
        while($row=$res->fetch_assoc()) $data[]=$row;
        echo json_encode($data);
        exit;
    }

    if ($_POST['action'] == 'getMembers') {
        $fid = intval($_POST['familyId']);
        $res = $conn->query("SELECT Person_Id, First_Name, Last_Name FROM PERSON WHERE Family_Id=$fid");

        $data=[];
        while($row=$res->fetch_assoc()) $data[]=$row;
        echo json_encode($data);
        exit;
    }

    if ($_POST['action'] == 'addRelation') {
        $p1 = intval($_POST['p1']);
        $p2 = intval($_POST['p2']);
        $rel = $_POST['relation'];

        $conn->query("INSERT INTO FAMILY_RELATION(Person_Id,Related_Person_Id,Relation_Type) VALUES($p1,$p2,'$rel')");
        $conn->query("INSERT INTO FAMILY_RELATION(Person_Id,Related_Person_Id,Relation_Type) VALUES($p2,$p1,'$rel')");

        echo json_encode(['success'=>true]);
        exit;
    }
}
?>

<?php require "Navbar.php"; ?>

<link rel="Stylesheet" href="../CSS/relation_page.css">


<div class="container">
    <h2>Add Relation</h2>

    <div class="section">
        <div class="row">
            <input id="f1" placeholder="Search Family 1">
            <button onclick="searchFamily(1)">Search</button>
            <select id="family1" onchange="loadMembers(1)"></select>
            <select id="person1"></select>
        </div>
    </div>

    <div class="section">
        <div class="row">
            <input id="f2" placeholder="Search Family 2">
            <button onclick="searchFamily(2)">Search</button>
            <select id="family2" onchange="loadMembers(2)"></select>
            <select id="person2"></select>
        </div>
    </div>

    <div class="section">
        <div class="row">
            <select id="relation">
                <option value="Father">Father</option>
                <option value="Mother">Mother</option>
                <option value="Son">Son</option>
                <option value="Daughter">Daughter</option>
                <option value="Husband-Wife">Husband-Wife</option>
                <option value="Wife-Husband">Wife-Husband</option>
            </select>
            <button onclick="saveRelation()">Add Relation</button>
        </div>
    </div>
</div>

<script>
function searchFamily(n) {
    let name = document.getElementById('f' + n).value;
    fetch("Add_relation.php", {
            method: "POST",
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: "action=searchFamily&family=" + name
        })
        .then(r => r.json()).then(data => {
            let sel = document.getElementById('family' + n);
            sel.innerHTML = "";
            data.forEach(f => {
                sel.innerHTML += `<option value="${f.Family_Id}">${f.Family_Name}</option>`;
            });
            loadMembers(n);
        });
}

function loadMembers(n) {
    let fid = document.getElementById('family' + n).value;
    fetch("Add_relation.php", {
            method: "POST",
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: "action=getMembers&familyId=" + fid
        })
        .then(r => r.json()).then(data => {
            let sel = document.getElementById('person' + n);
            sel.innerHTML = "";
            data.forEach(p => {
                sel.innerHTML += `<option value="${p.Person_Id}">${p.First_Name} ${p.Last_Name}</option>`;
            });
        });
}

function saveRelation() {
    let p1 = document.getElementById('person1').value;
    let p2 = document.getElementById('person2').value;
    let rel = document.getElementById('relation').value;

    fetch("Add_relation.php", {
            method: "POST",
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: `action=addRelation&p1=${p1}&p2=${p2}&relation=${rel}`
        })
        .then(r => r.json()).then(d => {
            alert("Relation Added Successfully!");
        });
}
</script>