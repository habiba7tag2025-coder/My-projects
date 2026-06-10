// الساعة
setInterval(()=>{
  document.getElementById("time").innerText =
    new Date().toLocaleTimeString();
}, 1000);

// فتح/قفل
function openApp(id){
  document.getElementById(id).classList.remove("hidden");
}
function closeApp(id){
  document.getElementById(id).classList.add("hidden");
}

// DRAG
function drag(e, el){
  let x = e.clientX, y = e.clientY;

  document.onmousemove = (e)=>{
    el.style.left = (el.offsetLeft + e.clientX - x) + "px";
    el.style.top = (el.offsetTop + e.clientY - y) + "px";
    x = e.clientX;
    y = e.clientY;
  }

  document.onmouseup = ()=> document.onmousemove = null;
}

// ================= FILE SYSTEM =================
function now(){
  return new Date().toLocaleString();
}

function createFile(){
  return {
    type: "file",
    content: "",
    created: now(),
    modified: now(),
    accessed: now(),
    changed: now(),
    permissions: "rw-r--r--"
  };
}

let fs = JSON.parse(localStorage.getItem("fs")) || {
  home: {}
};

let path = ["home"];

function getDir(){
  let dir = fs;
  path.forEach(p => dir = dir[p]);
  return dir;
}

function save(){
  localStorage.setItem("fs", JSON.stringify(fs));
}

// ================= EXPLORER =================
function renderFiles(){
  let div = document.getElementById("files");
  div.innerHTML = "";

  let dir = getDir();

  Object.keys(dir).forEach(f=>{
    let el = document.createElement("div");

    if(dir[f].type === "folder"){
      el.innerText = "📁 " + f;
      el.onclick = ()=>{
        path.push(f);
        renderFiles();
      }
    } else {
      el.innerText = "📄 " + f;
      el.onclick = ()=> openFile(f);
    }

    div.appendChild(el);
  });
}

// ================= FILE OPEN =================
function openFile(name){
  let file = getDir()[name];
  if(!file || file.type !== "file") return;

  file.accessed = now();
  save();

  let win = document.createElement("div");
  win.className = "window";

  win.innerHTML = `
    <div class="title" onmousedown="drag(event,this.parentElement)">
      ${name}
      <button onclick="this.parentElement.parentElement.remove()">X</button>
    </div>
    <textarea style="width:100%;height:200px;background:black;color:white;border:none;">${file.content}</textarea>
    <button onclick="saveFile('${name}', this)">Save</button>
  `;

  document.body.appendChild(win);
}

function saveFile(name, btn){
  let file = getDir()[name];
  file.content = btn.previousElementSibling.value;
  file.modified = now();
  file.changed = now();
  save();
}

// ================= TERMINAL =================
function runCommand(e){
  if(e.key==="Enter"){
    let input = document.getElementById("input");
    let cmd = input.value.trim();
    let out = document.getElementById("output");

    out.innerHTML += `
<div>
  <span class="user">user@vr:/${path.join("/")}$</span> 
  <span class="cmd">${cmd}</span>
</div>`;

  let rawParts = cmd.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
let parts = rawParts.map(p => {
  if(p.startsWith('"') && p.endsWith('"')){
    return p.slice(1, -1);
  }
  return p;
});
    let dir = getDir();
   function cleanName(name){
  return name
    .replace(/^["']+/, "")   // يشيل quotes من الأول
    .replace(/["']+$/, "");  // يشيل quotes من الآخر (حتى لو أكتر من واحدة)
}

    // ================= LS =================
if(parts[0]==="ls"){

  let target = dir;

  // ls folder
  if(parts[1] && !parts[1].startsWith("-")){
    if(dir[parts[1]] && dir[parts[1]].type==="folder"){
      target = dir[parts[1]];
    } else {
      out.innerHTML += "folder not found<br>";
      return;
    }
  }

  let files = Object.keys(target);

  // -a (إظهار المخفي)
  if(parts.includes("-a")){
    files = [".","..", ...files];
  }

  // -A (بدون .)
  if(parts.includes("-A")){
    files = ["..", ...files];
  }

  // -r (عكس)
  if(parts.includes("-r")){
    files.reverse();
  }

  // -S (حسب الحجم)
  if(parts.includes("-S")){
    files.sort((a,b)=>{
      let fa = target[a]?.content?.length || 0;
      let fb = target[b]?.content?.length || 0;
      return fb - fa;
    });
  }

  // -t (حسب التعديل)
  if(parts.includes("-t")){
    files.sort((a,b)=>{
      let fa = new Date(target[a]?.modified || 0);
      let fb = new Date(target[b]?.modified || 0);
      return fb - fa;
    });
  }

  // -X (حسب الامتداد)
  if(parts.includes("-X")){
    files.sort((a,b)=>{
      let ea = a.split(".").pop();
      let eb = b.split(".").pop();
      return ea.localeCompare(eb);
    });
  }

  // -h (تحويل الحجم)
  function formatSize(size){
    if(size < 1024) return size + "B";
    if(size < 1024*1024) return (size/1024).toFixed(1)+"K";
    return (size/(1024*1024)).toFixed(1)+"M";
  }

  // -1 (سطر سطر)
  if(parts.includes("-1")){
    files.forEach(f=>{
      out.innerHTML += f + "<br>";
    });
    return;
  }

  // -l / -lh / -la
  if(parts.includes("-l") || parts.includes("-lh") || parts.includes("-la")){
    files.forEach(f=>{
      let file = target[f];

      if(file){
        let size = file.content ? file.content.length : 0;
        if(parts.includes("-h")) size = formatSize(size);

        out.innerHTML += `${file.permissions} ${file.type} ${size} ${file.modified} ${f}<br>`;
      } else {
        out.innerHTML += f + "<br>";
      }
    });
    return;
  }

  // -d (عرض المجلد نفسه)
  if(parts.includes("-d")){
    out.innerHTML += path[path.length-1] + "<br>";
    return;
  }

  // عادي + ألوان
  files.forEach(f=>{
    if(target[f] && target[f].type === "folder"){
      out.innerHTML += `<span class="folder">${f}</span> `;
    } else {
      out.innerHTML += `<span class="file">${f}</span> `;
    }
  });

  out.innerHTML += "<br>";
}

    // pwd
    else if(cmd==="pwd"){
      out.innerHTML += "/" + path.join("/") + "<br>";
    }

    // cd
    else if(parts[0]==="cd"){
      if(parts[1]==="/" || parts[1] === "~"){
        path = ["home"];
      }
      else if(parts[1]===".."){
        if(path.length > 1) path.pop();
      }
      else if(dir[parts[1]] && dir[parts[1]].type==="folder"){
        path.push(parts[1]);
      } else {
        out.innerHTML += "folder not found<br>";
      }
      renderFiles();
    }

    // mkdir
    else if(parts[0]==="mkdir"){
      parts.slice(1).forEach(name=>{
  if(!name.startsWith("-")){
    dir[name] = { type:"folder", permissions:"rwxr-xr-x" };
  }
});
      save();
      renderFiles();
    }

  // ================= TOUCH =================
else if(parts[0] === "touch"){

  let options = [];
  let files = [];
  let refFile = null;
  let dateValue = null;

  parts.slice(1).forEach((p, i, arr) => {
    if(p.startsWith("-")){
      options.push(p);

      if(p === "-r"){
        refFile = cleanName(arr[i + 1]);
      }

      if(p === "-d"){
        dateValue = cleanName(arr[i + 1]);
      }

    } else {
      if(arr[i - 1] !== "-r" && arr[i - 1] !== "-d"){
        files.push(cleanName(p));
      }
    }
  });

  let refData = null;
  if(refFile && dir[refFile]){
    refData = dir[refFile];
  }

  // تحويل التاريخ
  let customTime = null;
  if(dateValue){
    customTime = new Date(dateValue);
    if(isNaN(customTime.getTime())){
      out.innerHTML += "Invalid date format<br>";
      return;
    }
  }

  files.forEach(name => {

    let exists = !!dir[name];

    // ===== -c =====
    if(options.includes("-c") && !exists){
      return;
    }

    if(!exists){
      dir[name] = createFile();
    }

    let file = dir[name];
    let changedFlag = false;

    // ===== -r =====
    if(refData){
      file.accessed = refData.accessed;
      file.modified = refData.modified;
      changedFlag = true;
    }

    // ===== -d =====
    if(customTime){
      if(options.includes("-a")){
        file.accessed = customTime;
      } else {
        file.modified = customTime;
      }
      changedFlag = true;
    }

    // ===== -a =====
    if(options.includes("-a") && !customTime){
      file.accessed = now();
      changedFlag = true;
    }

    // ===== -m =====
    if(options.includes("-m") && !customTime){
      file.modified = now();
      changedFlag = true;
    }

    // ===== بدون options =====
    if(!refData && !customTime && !options.includes("-a") && !options.includes("-m")){
      file.modified = now();
      changedFlag = true;
    }

    // ===== تحديث ctime =====
    if(changedFlag){
      file.changed = now();
    }

  });

  save();
  renderFiles();
}

   // ================= CAT =================
else if(parts[0] === "cat"){
  let option = parts[1]?.startsWith("-") ? parts[1] : null;
let files = option ? parts.slice(2) : parts.slice(1);

files.forEach(filename=>{
  let file = dir[filename];

  if(file && file.type === "file"){
    file.accessed = now();
    let lines = file.content.split("\n");

    if(option === "-n"){
      lines.forEach((line,i)=>{
        out.innerHTML += (i+1)+" "+line+"<br>";
      });
    }
    else if(option === "-s"){
      let prev=false;
      lines.forEach(line=>{
        if(line.trim()===""){
          if(!prev){
            out.innerHTML += "<br>";
            prev=true;
          }
        } else {
          out.innerHTML += line+"<br>";
          prev=false;
        }
      });
    }
    else{
      out.innerHTML += file.content.replace(/\n/g,"<br>")+"<br>";
    }

  } else {
    out.innerHTML += "file not found<br>";
  }
});
  if(file && file.type === "file"){
    file.accessed = now();

    let lines = file.content.split("\n");

    // ===== cat -n =====
    if(option === "-n"){
      let result = "";
      lines.forEach((line, i) => {
        result += (i + 1) + "  " + line + "<br>";
      });
      out.innerHTML += result;
    }

    // ===== cat -s =====
    else if(option === "-s"){
      let result = "";
      let prevEmpty = false;

      lines.forEach(line => {
        if(line.trim() === ""){
          if(!prevEmpty){
            result += "<br>";
            prevEmpty = true;
          }
        } else {
          result += line + "<br>";
          prevEmpty = false;
        }
      });

      out.innerHTML += result;
    }

    // ===== cat normal =====
    else{
      out.innerHTML += file.content.replace(/\n/g, "<br>") + "<br>";
    }

  } else {
    out.innerHTML += "file not found<br>";
  }
}

    // ================= ECHO =================
    else if(parts[0]==="echo"){
      let text = parts.slice(1).join(" ").replace(/"/g,"");

      if(parts.includes(">")){
        let i = parts.indexOf(">");
        text = parts.slice(1,i).join(" ").replace(/"/g,"");
        let fileName = parts[i+1];

        if(!dir[fileName]){
          dir[fileName] = createFile();
        }

        dir[fileName].content = text;
        dir[fileName].modified = now();
        dir[fileName].changed = now();

        save();
        renderFiles();
      } 
      else {
        out.innerHTML += text + "<br>";
      }
    }

    // nano
    else if(parts[0]==="nano"){
      let name = parts[1];
      if(!dir[name]) dir[name] = createFile();
      openFile(name);
    }// ================= BASH =================
else if(parts[0]==="bash"){
  let file = dir[parts[1]];

  if(file && file.type==="file"){
    file.accessed = now();

    let lines = file.content.split("\n");

    lines.forEach(line=>{
      if(line.trim() !== ""){
        out.innerHTML += `<div>> ${line}</div>`;
        document.getElementById("input").value = line;
        runCommand({key:"Enter"});
      }
    });

  } else {
    out.innerHTML += "file not found<br>";
  }
}

// ================= RM =================
else if(parts[0]==="rm"){

  let flags = parts.filter(p => p.startsWith("-")).join("");

  // نجمع الأسماء وبعدين ننظفها
  let rawTargets = [];

let stopOptions = false;

parts.slice(1).forEach(p => {
  if(p === "--"){
    stopOptions = true;
    return;
  }

  if(!stopOptions && p.startsWith("-")){
    return; // ده flag
  }

  rawTargets.push(p);
});

  let targets = rawTargets.map(p => cleanName(p));

  // helper: حذف
  function removeItem(name, recursive=false){
    let item = dir[name];

    if(!item){
      out.innerHTML += `rm: cannot remove '${name}': No such file<br>`;
      return;
    }

    // فولدر
    if(item.type === "folder"){
      if(!recursive){
        out.innerHTML += `rm: cannot remove '${name}': Is a directory<br>`;
        return;
      }

      // recursive delete
      delete dir[name];
    } 
    // ملف
    else {
      delete dir[name];
    }

    if(flags.includes("v")){
      out.innerHTML += `<span class="success">removed '${name}'</span><br>`;
    }
  }

  // مفيش arguments
  if(targets.length === 0){
    out.innerHTML += "rm: missing operand<br>";
    return;
  }

  targets.forEach(name=>{

    // -i (تأكيد)
    if(flags.includes("i")){
      if(!confirm("remove " + name + " ?")) return;
    }

    // -f (force)
    if(flags.includes("f")){
      try{
        removeItem(name, flags.includes("r") || flags.includes("R"));
      } catch(e){}
    }

    // -r / -R (recursive)
    else if(flags.includes("r") || flags.includes("R")){
      removeItem(name, true);
    }

    // حذف عادي
    else{
      removeItem(name, false);
    }

  });

  save();
  renderFiles();
}

    // cp
    else if(parts[0]==="cp"){
      let src = dir[parts[1]];
      if(src){
        dir[parts[2]] = JSON.parse(JSON.stringify(src));
        save();
        renderFiles();
      }
    }

    // mv
    else if(parts[0]==="mv"){
      dir[parts[2]] = dir[parts[1]];
      delete dir[parts[1]];
      save();
      renderFiles();
    }

    // stat
    else if(parts[0]==="stat"){
      let file = dir[parts[1]];
      if(file){
        out.innerHTML += `
Type: ${file.type}<br>
Created: ${file.created}<br>
Modified: ${file.modified}<br>
Accessed: ${file.accessed}<br>
Changed: ${file.changed}<br>
Permissions: ${file.permissions}<br>`;
      } else {
        out.innerHTML += "file not found<br>";
      }
    }// ================= CHMOD =================
else if(parts[0]==="chmod"){
  let perm = parts[1];
  let file = dir[parts[2]];

  if(!file){
    out.innerHTML += "file not found<br>";
    return;
  }

  // لو رقم (777)
  if(/^[0-7]{3}$/.test(perm)){
    let map = ["---","--x","-w-","-wx","r--","r-x","rw-","rwx"];
    file.permissions =
      map[perm[0]] + map[perm[1]] + map[perm[2]];
  }

  // لو symbolic (u+x)
  else if(/[ugo][+-=][rwx]/.test(perm)){
    let who = perm[0];
    let op = perm[1];
    let val = perm[2];

    let p = file.permissions.split("");

    let index = {
      u: [0,1,2],
      g: [3,4,5],
      o: [6,7,8]
    };

    index[who].forEach(i=>{
      let charIndex = {r:0,w:1,x:2}[val];
      let pos = index[who][charIndex];

      if(op === "+") p[pos] = val;
      if(op === "-") p[pos] = "-";
      if(op === "="){
        index[who].forEach(j=> p[j] = "-");
        p[pos] = val;
      }
    });

    file.permissions = p.join("");
  }

  file.changed = now();
  save();
}

    // clear
    else if(cmd==="clear"){
      out.innerHTML="";
    }

    // help
    else if(cmd==="help"){
      out.innerHTML += `
ls<br>
pwd<br>
cd<br>
mkdir<br>
touch<br>
cat<br>
bash<br>
chmod<br>
echo<br>
nano<br>
rm<br>
cp<br>
mv<br>
stat<br>
clear<br>
exit<br>`;
    }

    // exit
    else if(cmd==="exit"){
      document.getElementById("terminal").classList.add("hidden");
    }

    else{
      out.innerHTML += "command not found<br>";
    }

    input.value="";
    out.scrollTop = out.scrollHeight;
  }
}

// تشغيل
renderFiles();