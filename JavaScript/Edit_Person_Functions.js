const fs = document.getElementById("familySearch");
    const fr = document.getElementById("familyResults");
    const memberList = document.getElementById("memberList");
    const form = document.getElementById("editForm");

    fs.oninput = () => {
        const q = fs.value.trim();
        if (!q) {
            fr.innerHTML = "";
            return;
        }

        fetch(`Edit_Person.php?action=searchFamily&q=${encodeURIComponent(q)}`)
            .then(r => r.json()).then(d => {
                fr.innerHTML = "";
                d.forEach(f => {
                    let x = document.createElement("div");
                    x.className = "result";
                    x.textContent = `${f.Family_Name} (${f.Native_Place})`;
                    x.onclick = () => {
                        fr.innerHTML = `<div class="selected-family">✔ ${f.Family_Name}</div>`;
                        loadMembers(f.Family_Id);
                    };
                    fr.appendChild(x);
                });
            });
    };

    function loadMembers(fid) {
        fetch(`Edit_Person.php?action=loadMembers&family=${fid}`)
            .then(r => r.json()).then(d => {
                memberList.innerHTML = "";
                memberList.classList.remove("hidden");
                d.forEach(p => {
                    let o = document.createElement("option");
                    o.value = p.Person_Id;
                    o.textContent = p.First_Name + " " + p.Last_Name;
                    memberList.appendChild(o);
                });
            });
    }

    memberList.onchange = () => {
        fetch(`Edit_Person.php?action=loadPerson&person=${memberList.value}`)
            .then(r => r.json()).then(p => {
                document.getElementById("person_id").value = p.Person_Id;
                document.getElementById("first").value = p.First_Name;
                document.getElementById("last").value = p.Last_Name;
                document.getElementById("father").value = p.father_name;
                document.getElementById("mother").value = p.mother_name;
                document.getElementById("gender").value = p.Gender;
                document.getElementById("dob").value = p.DOB;
                document.getElementById("phone").value = p.Phone_Number;
                document.getElementById("mobile").value = p.Mobile_Number;
                document.getElementById("email").value = p.Email;
                document.getElementById("native").value = p.Original_Native;
                document.getElementById("address").value = p.Current_Address;
                document.getElementById("gotra").value = p.Gotra_Id;
                document.getElementById("sutra").value = p.Sutra_Id;
                document.getElementById("panchang").value = p.Panchang_Sudhi_Id;
                document.getElementById("vamsha").value = p.Vamsha_Id;
                document.getElementById("mane_devru").value = p.Mane_Devru_Id;
                document.getElementById("kula_devatha").value = p.Kula_Devatha_Id;
                document.getElementById("pooja_vruksha").value = p.Pooja_Vruksha_Id;

                form.classList.remove("hidden");
            });
    };