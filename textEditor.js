const input = document.getElementById("input");
const output = document.getElementById("txt");
const lineDisplay = document.getElementById("line-count");
const runBtn = document.getElementById("run-btn");
const consoleContent = document.getElementById("console-content");

const {log} = console;

function segmentMsg(msg){
    const consoleWidth= consoleContent.clientWidth;
    log(consoleWidth);
    let outputMsg = "";
    for(let i = 0; i < msg.length; i++){
        outputMsg += msg[i];
        if(((i+1) % Math.floor(consoleWidth/8)) == 0)outputMsg += "<br>"
    }
    return outputMsg
}

console.log = function (){
    let msg = "";
    for(let i = 0; i < arguments.length; i++)msg += arguments[i];
    msg = segmentMsg(msg);
    log(msg)
    consoleContent.innerHTML += `${msg.replaceAll(" ", "&nbsp;")} <hr>`;
    consoleContent.scrollTop = consoleContent.scrollHeight
}

function countLJ(txt) {
    let lastIndex = -1;
    let indexes = [];
    do {
        lastIndex = txt.indexOf("\n", lastIndex + 1);
        if (lastIndex != -1) indexes.push(lastIndex);
    } while (lastIndex != -1);
    return indexes.length;
}

function displayLinesNumbers() {
    let lineCount = countLJ(input.value);
    lineDisplay.innerHTML = "1";
    for (let i = 0; i < lineCount; i++) {
        lineDisplay.innerHTML += "<br>" + (i + 2);
    }
}

const HIGHLIGHT = GENERATE_HIGHLIGHTER();

input.oninput = () => {
    output.innerHTML = HIGHLIGHT(input.value);
    input.style.height = "";
    input.style.height = input.scrollHeight + "px";
    displayLinesNumbers();
};


input.onkeydown = (e) => {
    if (e.code === "Tab") {
        e.preventDefault();
        input.value += "   ";
    }
    if(e.code == "F5"){
        e.preventDefault();
        runBtn.click();
    }
};

let runCount = 0;
runBtn.onclick = ()=>{
    runCount++;
    consoleContent.innerHTML += `<p class="new-run-decl">new run (n°${runCount}):</p> <hr class="new-run-hr">`
    eval(input.value);
}