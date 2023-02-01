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
    if(!instructions[0])return txt;

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
        let startsIndexes = [];
        let endIndexes = [];

        for (let i = 0; i < indexes.length; i += 2) {
            startsIndexes.push(indexes[i]);
            endIndexes.push(indexes[i + 1] || txt.length);
        }

        for(let i = 0; i < startsIndexes.length; i++){
            let instruction = {
                from: startsIndexes[i],
                to: endIndexes[i] == txt.length ? txt.length : endIndexes[i] + enclosureEnd.length,
                mode: "encapsulate",
                value: {
                    before:`<span style="color:${color}">`,
                    after:"</span>"
                },
                priority
            };
            instructions.push(instruction)
        }
    }else{
        let startIndexes = txt.indexOfAll(enclosureStart);
        let endIndexes = [];
        startIndexes.forEach(sI => endIndexes.push( txt.indexOf(enclosureEnd, sI+1)) > 0 ?  txt.indexOf(enclosureEnd, sI+1) : txt.length)

        for(let i = 0; i < startIndexes.length; i++){
            let instruction = {
                from:startIndexes[i],
                to:endIndexes[i] + enclosureEnd.length || txt.length,
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
            //check if word between two word separators
            for(const wordIndex of wordIndexes){
                for(const wordSep of wordSeps)
                    if(txt.substring(wordIndex[0]-wordSep.length, wordIndex[0]) == wordSep || !wordSep || wordIndex[0] == 0){
                        validity++;
                        break;
                    }
                for(const wordSep of wordSeps)
                    if(txt.substring(wordIndex[1], wordIndex[1] + wordSep.length) == wordSep || !wordSep || wordIndex[1] == txt.length){
                        validity++;
                        break;
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

function getSpacesInstructions(txt, priority){
    let spacesIndexes = txt.indexOfAll(" ");

    let instructions = [];

    for(const spaceIndex of spacesIndexes)
        instructions.push({
            from:spaceIndex,
            to:spaceIndex+1,
            mode:"replace",
            value:"&nbsp;",
            priority,
        })

    return instructions;
}

function getLineJumpsInstrunctions(txt, priority){
    let ljIndexes = txt.indexOfAll("\n");

    let instructions = [];

    for(const ljIndex of ljIndexes)
        instructions.push({
            from:ljIndex,
            to:ljIndex+1,
            mode:"replace",
            value:"<br>",
            priority,
        })

    return instructions;
}

function getDynamicNewRule(txt, rule){
    const {color, declarators, wordEnds, declaratorsStarts, declaratorsEnds,wordSeps, priority} = rule;
    let matchingWords = [];

    for(const declarator of declarators){
        let declaratorsIndexes = txt.fullIndexOfAll(declarator);
        console.log(declaratorsIndexes);
        // remove from decIndexes if invalid declarator start
        declaratorsIndexes.conditionalRemove((dec) =>!declaratorsStarts.some(
            d => d == txt.substring((dec[0] - d.length) >= 0 ? dec[0] - d.length : 0, dec[0]) ) || !d || dec[0]==0
        );
        console.log(declaratorsIndexes);

        // remove from decIndexes if invalid declarator end
        declaratorsIndexes.conditionalRemove(dec => !declaratorsEnds.some(
            d => d == txt.substring(dec[1], dec[1] + d.length <= txt.length ? dec[1] + d.length : txt.length) ) || !d || dec[1] == txt.length
        );
        console.log(declaratorsIndexes);

        // add every word after valid declarators to matchingWords
        declaratorsIndexes.forEach((dec)=> matchingWords.push(txt.substring(dec[1], dec[1] + declarator.length)))
    }

    let hashmap = {};
    hashmap[color] = matchingWords;

    let newRule = {
        type:"word-coloring",
        hashmap,
        wordSeps,
        priority
    }
    console.log(matchingWords)

    return matchingWords ? newRule: {};
}

function handlePriorities(instructions){
    let priorities = new Set();
    instructions.forEach(i => priorities.add(i.priority));
    // sort priorities descending
    priorities = [...priorities].sort((a,b)=>b - a);
    // remove lowest priority since elements with lowest priority won't affect others 
    priorities.pop();

    let clearedInstructions = [...instructions];

    for(const priority of priorities)
        for(const parent of instructions)
            if(parent.priority == priority)
                for(const instruction of instructions)
                    if(instruction.priority < priority)
                        if(instruction.from >= parent.from && instruction.to <= parent.to)
                            clearedInstructions.conditionalRemove(i => i == instruction)
                    
    return clearedInstructions;
}

let defaultRules = [
    {
        type: "word-highlighting",
        hashmap: {
            "rgb(110, 134, 235)": ["this", "const", "let", "function"],
            "rgb(189, 109, 214)": ["for", "return", "while", "do", "if"],
            "rgb(110, 154, 235)": ["false", "true"]
        },

        wordSeps: " ,/+_)(*&^%@!=[]{}';|<>?\n".split(""),
        priority: 0,
    },
    {
        type: "word-highlighting",
        hashmap: {
            "rgb(199, 242, 175)": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
            lightGrey: ",./+_*&^%@!=-;|<>?".split(""),
            "rgb(70, 144, 255)": "[]{}()".split(""),
        },

        wordSeps: [""],
        priority: 0,
    },
    {
        type: "enclosure-highlighting",
        enclosures: [
            {
                color: "rgb(225, 140, 125)",
                enclosureStart: "'",
                enclosureEnd: "'",
                priority: 1,
            },
            {
                color: "rgb(225, 140, 125)",
                enclosureStart: "\"",
                enclosureEnd: "\"",
                priority: 2,
            },
            {
                color: "green",
                enclosureStart: "//",
                enclosureEnd: "\n",
                priority: 3,
            },
        ],
    },
    {
        type: "dynamic-word-to-color-declaration",
        color:"rgb(120, 154, 235)",
        declarators:["const "],
        wordEnds:" ,./+_*&^%@!=-;|<>?\n".split(""),
        declaratorsStarts: " ;\n".split(""),
        declaratorsEnds:[" "],
        wordSeps:" ,./+_*&^%@!=-;|<>?\n".split(""),
        priority:0
    }
];

function GENERATE_HIGHLIGHTER(rules = defaultRules) {
    function HIGHLIGHT(txt) {
        let instructions = [];

        // generate rules dynamicly to color vairables for instance

        let newRules = [];
        for(const rule of rules){
            if(rule.type === "dynamic-word-to-color-declaration"){
                // newRules.push(getDynamicNewRule(txt, rule))
            }
        }
        if(newRules[0])
            instructions.push(...newRules);

        for (const rule of rules) {
            if (rule.type === "word-highlighting") {
                instructions.push(...getWordsInstructions(txt, rule));
            }
            if(rule.type === "enclosure-highlighting"){
                instructions.push(...getEnclosureArrInstructions(txt, rule.enclosures));
            }
        }

        ///////// default settings ///////////

        if(!rules.some(r => r.type === "HTML-line-jumps" && r.set == false)){
            instructions.push(...getLineJumpsInstrunctions(txt, 4));
        }

        if(!rules.some(r => r.type === "HTML-spaces" && r.set == false)){
            instructions.push(...getSpacesInstructions(txt, 5));
        }

        // remove instructions enclosed by higher priority tags
        instructions = handlePriorities(instructions);

        console.log(instructions);

        return generateHTML(txt, instructions);
    }

    return HIGHLIGHT;
}

// TESTS

// let txt1 = "this is this some basic code with 'a string in it' // this is a commentary\n";
// const HIGHLIGHT = GENERATE_HIGHLIGHTER();
// console.log(HIGHLIGHT(txt1));