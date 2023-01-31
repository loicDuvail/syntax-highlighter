//returns start and end index of every matches in string
String.prototype.fullIndexOfAll = function (searchString) {
    let lastStartIndex = -1;
    let indexes = [];
    do {
        // get start index
        let startIndex = this.indexOf(
            searchString.toString(),
            lastStartIndex + 1
        );
        lastStartIndex = startIndex;
        if (startIndex != -1) {
            //get endIndex
            let endIndex = startIndex + (searchString.length || 1);
            if (endIndex > this.length) endIndex = this.length;
            indexes.push([startIndex, endIndex]);
        }
    } while (lastStartIndex != -1);
    return indexes;
};

String.prototype.indexOfAll = function (searchString) {
    let lastStartIndex = -1;
    let indexes = [];

    do {
        let index = this.indexOf(searchString, lastStartIndex + 1);
        lastStartIndex = index;
        if (index != -1) indexes.push(index);
    } while (lastStartIndex != -1);

    return indexes;
};

Array.prototype.conditionalRemove = function (callback) {
    let clearedArr = [];
    for (let i = 0; i < this.length; i++) {
        if (!callback(this[i])) clearedArr.push(this[i]);
    }
    this.splice(0, this.length, ...clearedArr);
};

function getStrModifier(txt) {
    let alteredIndexes = [];
    for (let i = 0; i < txt.length; i++) {
        alteredIndexes.push(i);
    }

    let intialTxtLen = txt.length;

    function alter(from, to, mode, value) {
        let actualFrom = alteredIndexes[from];
        let actualTo = alteredIndexes[to - 1] + 1;

        if (mode == "replace") {
            let preValue = txt.substring(0, actualFrom);
            let postValue = actualTo ? txt.substring(actualTo) : "";

            txt = preValue + value + postValue;

            for (let i = to; i < intialTxtLen; i++) {
                alteredIndexes[i] += value.length - (to - from);
            }
        }

        if (mode == "encapsulate") {
            let preValue = txt.substring(0, actualFrom);
            let postValue = actualTo ? txt.substring(actualTo) : "";
            let innerValue = txt.substring(actualFrom, actualTo);

            txt =
                preValue + value.before + innerValue + value.after + postValue;

            for (let i = from; i < intialTxtLen; i++) {
                alteredIndexes[i] += value.before.length;
            }
            for (let i = to; i < intialTxtLen; i++) {
                alteredIndexes[i] += value.after.length;
            }
        }
        return txt;
    }

    return alter;
}

function generateHTML(txt, instructions) {
    let alter = getStrModifier(txt);
    let html;
    for (const instruction of instructions) {
        const { from, to, mode, value } = instruction;
        html = alter(from, to, mode, value);
    }
    return html;
}

function getEnclosureInstructions(txt, enclosure) {
    const { enclosureStart, enclosureEnd, color, priority } = enclosure;
    let instructions = [];
    if (enclosureStart === enclosureEnd) {
        let indexes = txt.indexOfAll(enclosureStart.toString());
        console.log(indexes, enclosureStart, txt)
        let startsIndexes = [];
        let endIndexes = [];

        for (let i = 0; i < indexes.length; i += 2) {
            startsIndexes.push(indexes[i]);
            endIndexes.push(indexes[i + 1] || txt.length);
        }

        for(let i = 0; i < startsIndexes.length; i++){
            let instruction = {
                from:startsIndexes[i] + enclosureStart.length,
                to:endIndexes[i] || txt.length,
                mode:"encapsulate",
                value:{
                    before:`<span style="color:${color}">`,
                    after:"</span>"
                },
                priority
            };
            instructions.push(instruction)
        }
    }else{
        let startIndexes = txt.indexOfAll(enclosureStart);
        let endIndexes = txt.indexOfAll(enclosureEnd);

        for(let i = 0; i < startIndexes.length; i++){
            let instruction = {
                from:startIndexes[i] + enclosureStart.length,
                to:endIndexes[i] || txt.length,
                mode:"encapsulate",
                value:{before:`<span style="color:${color}">`, after:"</span>"},
                priority
            };
            instructions.push(instruction)
        }
    };
    return instructions;
}

function getEnclosureArrInstructions(txt, enclosures){
    let instructions = [];
    for(const enclosure of enclosures){
        console.log(enclosure)
        instructions.push(...getEnclosureInstructions(txt, enclosure))
    }
    return instructions;
}

function getWordsInstructions(txt, rule){
    let instructions = [];
    const {hashmap, wordSeps, priority} = rule;
    for(const [color, words] of Object.entries(hashmap))
        for(const word of words){
            let wordIndexes = txt.fullIndexOfAll(word);
            let validity = 0;
            for(const wordIndex of wordIndexes){
                for(const wordSep of wordSeps){
                    if(txt.substring(wordIndex[0]-wordSep.length, wordIndex[0]) == wordSep)
                        validity++;
                    if(txt.substring(wordIndex[1], wordIndex[1]-1 + wordSep.length) == wordSep)
                        validity++;
                }
            if(validity >= 2){
                let instruction = {
                    from: wordIndex[0],
                    to:wordIndex[1],
                    mode:"encapsulate",
                    value:{before:`<span style="color:${color}">`, after:"</span>"},
                    priority:priority
                }
                instructions.push(instruction)
            }
            }   
            
        }
    return instructions;
}

let defaultRules = [
    {
        type: "word-highlighting",
        hashmap: {
            "rgb(110, 134, 235)": ["this", "const", "let", "function"],
            "rgb(189, 109, 214)": ["for", "return", "while", "do"],
        },

        wordSeps: " ,./+_)(*&^%@!=[]{}';|<>?\n".split(""),
        priority: 0,
    },
    {
        type: "word-highlighting",
        hashmap: {
            "rgb(199, 242, 175)": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
            lightGrey: ",./+_*&^%@!=-;|<>?".split(""),
            "rgb(70, 144, 255)": "[]{}()".split(""),
            "rgb(225, 140, 125)": ["'"],
        },

        wordSeps: [""],
        priority: 0,
    },
    {
        type: "enclosure-highlighting",
        enclosures: [
            {
                color: "red",
                enclosureStart: "'",
                enclosureEnd: "'",
                priority: 1,
            },
            {
                color: "green",
                enclosureStart: "//",
                enclosureEnd: "\n",
                priority: 1,
            },
        ],
    },
];

function GENERATE_HIGHLIGHTER(rules = defaultRules) {
    function HIGHLIGHT(txt) {
        let instructions = [];
        for (const rule of rules) {
            if (rule.type === "word-highlighting") {
                instructions.push(...getWordsInstructions(txt, rule));
            }
            if(rule.type === "enclosure-highlighting"){
                instructions.push(...getEnclosureArrInstructions(txt, rule.enclosures));
            }
        }
        return generateHTML(txt, instructions);
    }

    return HIGHLIGHT;
}

// TESTS

let txt = "this is a code for you, for thee has that code been";
let html = generateHTML(txt, [
    {
        from: 0,
        to: 4,
        mode: "encapsulate",
        value: { before: `<span style="color:blue">`, after: "</span>" },
    },
    {
        from: 7,
        to: 10,
        mode: "encapsulate",
        value: { before: `<span style="color:blue">`, after: "</span>" },
    },
    {
        from: 7,
        to: 8,
        mode: "replace",
        value: "&nbsp;",
    },
    {
        from: 9,
        to: 10,
        mode: "replace",
        value: "&nbsp;",
    },
    {
        from: 10,
        to: 14,
        mode: "replace",
        value: "small test",
    },
    {
        from: 42,
        to: 46,
        mode: "encapsulate",
        value: { before: `<span style="color:blue">`, after: "</span>" },
    },
]);


console.log(html);

let txt1 = "this is some basic code with 'a string in it' // this is a commentary\n"
const HIGHLIGHT = GENERATE_HIGHLIGHTER();
console.log(HIGHLIGHT(txt1));