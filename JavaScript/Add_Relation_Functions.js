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


function Reverse_Relation(){
        
}