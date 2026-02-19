const fs = document.getElementById("familySearch");
    const fr = document.getElementById("familyResults");
    const pf = document.getElementById("personForm");
    const fid = document.getElementById("family_id");

    fs.oninput = () => {
        const q = fs.value.trim();
        if (!q) {
            fr.innerHTML = "";
            return;
        }

        fetch(`Add_Person.php?action=searchFamily&q=${encodeURIComponent(q)}`)
            .then(r => r.json())
            .then(d => {
                fr.innerHTML = "";
                d.forEach(f => {
                    let x = document.createElement("div");
                    x.className = "result";
                    x.textContent = `${f.Family_Name} (${f.Native_Place})`;

                    x.onclick = () => {
                        fid.value = f.Family_Id;
                        fr.innerHTML = `<div class="selected-family">✔ ${f.Family_Name}</div>`;
                        pf.classList.remove("hidden");

                        loadMembers(f.Family_Id);

                        fetch(`Add_Person.php?action=getFamilySpiritualData&family=${f.Family_Id}`)
                            .then(r => r.json())
                            .then(data => {
                                if (!data) return;

                                if (data.Gotra_Id) document.getElementById("gotra").value = data
                                    .Gotra_Id;
                                if (data.Sutra_Id) document.getElementById("sutra").value = data
                                    .Sutra_Id;
                                if (data.Panchang_Sudhi_Id) document.getElementById("panchang")
                                    .value = data.Panchang_Sudhi_Id;
                                if (data.Vamsha_Id) document.getElementById("vamsha").value =
                                    data.Vamsha_Id;
                                if (data.Mane_Devru_Id) document.getElementById("mane_devru")
                                    .value = data.Mane_Devru_Id;
                                if (data.Kula_Devatha_Id) document.getElementById(
                                    "kula_devatha").value = data.Kula_Devatha_Id;
                                if (data.Pooja_Vruksha_Id) document.getElementById(
                                    "pooja_vruksha").value = data.Pooja_Vruksha_Id;
                            });
                    };
                    fr.appendChild(x);
                });
            });
    };

    function loadMembers(id) {
        fetch(`Add_Person.php?action=loadMembers&family=${id}`)
            .then(r => r.json())
            .then(d => {
                const e = document.getElementById("familyMemberList");
                e.innerHTML = "";
                d.forEach(p => {
                    let o = document.createElement("option");
                    o.value = p.Person_Id;
                    o.textContent = p.First_Name;
                    e.appendChild(o);
                });
            });
    }


    /* ================= FEMALE LOGIC ================= */

    const genderSelect = document.getElementById("gender");
    const femaleBox = document.getElementById("femaleBox");
    const marriedSelect = document.getElementById("married");
    const marriageBox = document.getElementById("marriageBox");

    /* Show Married dropdown when Female selected */
    genderSelect.addEventListener("change", function() {
        if (this.value === "Female") {
            femaleBox.classList.remove("hidden");
        } else {
            femaleBox.classList.add("hidden");
            marriageBox.classList.add("hidden");
        }
    });

    /* Show Husband search if Married = Yes */
    marriedSelect.addEventListener("change", function() {
        if (this.value === "yes") {
            marriageBox.classList.remove("hidden");
        } else {
            marriageBox.classList.add("hidden");
        }
    });

    /* ================= HUSBAND SEARCH ================= */

    const hfs = document.getElementById("husbandFamilySearch");
    const hfr = document.getElementById("husbandFamilyResults");

    hfs.oninput = () => {
        const q = hfs.value.trim();
        if (!q) {
            hfr.innerHTML = "";
            return;
        }

        fetch(`Add_Person.php?action=searchFamily&q=${encodeURIComponent(q)}`)
            .then(r => r.json())
            .then(d => {
                hfr.innerHTML = "";

                d.forEach(f => {
                    let div = document.createElement("div");
                    div.className = "result";
                    div.textContent = `${f.Family_Name} (${f.Native_Place})`;

                    div.onclick = () => {
                        hfr.innerHTML = `<div class="selected-family">✔ ${f.Family_Name}</div>`;

                        fetch(`Add_Person.php?action=loadMembers&family=${f.Family_Id}&gender=Male`)
                            .then(r => r.json())
                            .then(members => {
                                const husbandList = document.getElementById("husbandList");
                                husbandList.innerHTML = "";

                                members.forEach(p => {
                                    let option = document.createElement("option");
                                    option.value = p.Person_Id;
                                    option.textContent = p.First_Name;
                                    husbandList.appendChild(option);
                                });
                            });
                    };

                    hfr.appendChild(div);
                });
            });
    };