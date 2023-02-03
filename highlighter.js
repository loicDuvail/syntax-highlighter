//returns start and end index of every matches in string
String.prototype.fullIndexOfAll = function (searchString) {
    if (searchString === "") return [];
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
    if (!instructions[0]) return txt;

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

        for (let i = 0; i < startsIndexes.length; i++) {
            let instruction = {
                from: startsIndexes[i],
                to:
                    endIndexes[i] == txt.length
                        ? txt.length
                        : endIndexes[i] + enclosureEnd.length,
                mode: "encapsulate",
                value: {
                    before: `<span style="color:${color}">`,
                    after: "</span>",
                },
                priority,
            };
            instructions.push(instruction);
        }
    } else {
        let startIndexes = txt.indexOfAll(enclosureStart);
        let endIndexes = [];
        startIndexes.forEach((sI) =>
            endIndexes.push(txt.indexOf(enclosureEnd, sI + 1)) > 0
                ? txt.indexOf(enclosureEnd, sI + 1)
                : txt.length
        );

        for (let i = 0; i < startIndexes.length; i++) {
            let instruction = {
                from: startIndexes[i],
                to: endIndexes[i] + enclosureEnd.length || txt.length,
                mode: "encapsulate",
                value: {
                    before: `<span style="color:${color}">`,
                    after: "</span>",
                },
                priority,
            };
            instructions.push(instruction);
        }
    }
    return instructions;
}

function getEnclosureArrInstructions(txt, enclosures) {
    let instructions = [];
    for (const enclosure of enclosures) {
        instructions.push(...getEnclosureInstructions(txt, enclosure));
    }
    return instructions;
}

function getWordsInstructions(txt, rule) {
    let instructions = [];
    let { hashmap, wordSeps, priority, from, to } = rule;
    for (const [color, words] of Object.entries(hashmap))
        for (const word of words) {
            let wordIndexes = txt.fullIndexOfAll(word);
            // removes wordIndexes if not between from and to if precised
            if (from || to) {
                from ||= 0;
                to ||= txt.length;
                wordIndexes.conditionalRemove((w) => w[0] < from || w[1] > to);
            }
            //check if word between two word separators
            for (const wordIndex of wordIndexes) {
                let preValid = false,
                    postValid = false;
                for (const wordSep of wordSeps)
                    if (
                        txt.substring(
                            wordIndex[0] - wordSep.length,
                            wordIndex[0]
                        ) == wordSep ||
                        !wordSep ||
                        wordIndex[0] == 0
                    ) {
                        preValid = true;
                        break;
                    }
                for (const wordSep of wordSeps)
                    if (
                        txt.substring(
                            wordIndex[1],
                            wordIndex[1] + wordSep.length
                        ) == wordSep ||
                        !wordSep ||
                        wordIndex[1] == txt.length
                    ) {
                        postValid = true;
                        break;
                    }

                if (preValid && postValid) {
                    let instruction = {
                        from: wordIndex[0],
                        to: wordIndex[1],
                        mode: "encapsulate",
                        value: {
                            before: `<span style="color:${color}">`,
                            after: "</span>",
                        },
                        priority: priority,
                    };
                    instructions.push(instruction);
                }
            }
        }

    return instructions;
}

function getFunctionInstructions(txt, rule) {
    const { color, priority, preFuncs, postFunc } = rule;

    let instructions = [];

    let postFuncIndexes = txt.indexOfAll(postFunc);

    if (!postFuncIndexes) return {};

    for (const postFuncIndex of postFuncIndexes)
        for (let i = postFuncIndex - 1; i >= 0; i--) {
            let done = false;
            for (const preFunc of preFuncs) {
                if (
                    txt.substring(i, i + preFunc.length) == preFunc ||
                    !preFunc ||
                    i == 0
                ) {
                    let instruction = {
                        mode: "encapsulate",
                        from: i != 0 ? i + preFunc.length : 0,
                        to: postFuncIndex,
                        value: {
                            before: `<span style="color:${color}">`,
                            after: "</span>",
                        },
                        priority,
                    };
                    instructions.push(instruction);
                    done = true;
                    break;
                }
            }
            if (done) break;
        }

    return instructions;
}

function getSpacesInstructions(txt, priority) {
    let spacesIndexes = txt.indexOfAll(" ");

    let instructions = [];

    for (const spaceIndex of spacesIndexes)
        instructions.push({
            from: spaceIndex,
            to: spaceIndex + 1,
            mode: "replace",
            value: "&nbsp;",
            priority,
        });

    return instructions;
}

function getLineJumpsInstrunctions(txt, priority) {
    let ljIndexes = txt.indexOfAll("\n");

    let instructions = [];

    for (const ljIndex of ljIndexes)
        instructions.push({
            from: ljIndex,
            to: ljIndex + 1,
            mode: "replace",
            value: "<br>",
            priority,
        });

    return instructions;
}

function getLessThanInstructions(txt, priority) {
    let instructions = [];

    let ltIndexes = txt.indexOfAll("<");

    for (const ltIndex of ltIndexes) {
        instructions.push({
            from: ltIndex,
            to: ltIndex + 1,
            mode: "replace",
            value: "&lt;",
            priority,
        });
    }
    return instructions;
}

function getDynamicNewRule(txt, rule) {
    const {
        color,
        declarators,
        declaratorsStarts,
        declaratorsEnds,
        declarationEnds,
        wordBefores,
        wordAfters,
        priority,
        blockStart,
        blockEnd,
    } = rule;

    let newWordsToHighlight = [];

    // indexes of every declarator found and the wordSeparator after it
    let declaratorInstances = findEnclosedWords(
        declaratorsStarts,
        declaratorsEnds,
        declarators,
        txt
    );

    for (const declaratorInstance of declaratorInstances) {
        let wordPossibleEnds = [];
        for (const declarationEnd of declarationEnds) {
            wordPossibleEnds.push(
                txt.indexOf(
                    declarationEnd,
                    declaratorInstance.to + declaratorInstance.after.length || 0
                )
            );
        }
        let wordEnd = wordPossibleEnds.sort((a, b) => a - b).shift();
        while (wordEnd == -1 && wordPossibleEnds[0])
            wordEnd = wordPossibleEnds.shift();
        if (wordEnd == -1 || !wordEnd) wordEnd = txt.length;

        let wordStartIndex =
            declaratorInstance.to + declaratorInstance.after.length;

        newWordsToHighlight.push(txt.substring(wordStartIndex, wordEnd));
    }

    if (!newWordsToHighlight[0]) return {};

    let hashmap = {};
    hashmap[color] = newWordsToHighlight;

    let newRule = {
        type: "word-highlighting",
        hashmap,
        wordSeps: wordBefores,
        priority,
    };

    return newRule;
}

// melts your brain
function findEnclosedWords(befores, afters, words, txt) {
    let enclosedWords = [];
    for (const word of words) {
        let wordIndexes = txt.fullIndexOfAll(word);
        for (const wordIndex of wordIndexes) {
            let preValid = false,
                postValid = false;
            for (const before of befores)
                if (
                    before ==
                        txt.substring(
                            wordIndex[0] - before.length >= 0
                                ? wordIndex[0] - before.length
                                : 0,
                            wordIndex[0]
                        ) ||
                    !before ||
                    wordIndex[0] == 0
                ) {
                    preValid = true;
                    break;
                }

            for (const after of afters) {
                if (
                    !after ||
                    wordIndex[1] == txt.length ||
                    after ==
                        txt.substring(wordIndex[1], wordIndex[1] + after.length)
                ) {
                    postValid = true;
                    if (preValid && postValid)
                        enclosedWords.push({
                            from: wordIndex[0],
                            to: wordIndex[1],
                            after,
                        });
                    break;
                }
            }
        }
    }
    return enclosedWords;
}

function handlePriorities(instructions) {
    let priorities = new Set();
    instructions.forEach((i) => priorities.add(i.priority));
    // sort priorities descending
    priorities = [...priorities].sort((a, b) => b - a);
    // remove lowest priority since elements with lowest priority won't affect others
    priorities.pop();

    let clearedInstructions = [...instructions];

    for (const priority of priorities)
        for (const parent of instructions)
            if (parent.priority == priority)
                for (const instruction of instructions)
                    if (instruction.priority < priority)
                        if (
                            instruction.from >= parent.from &&
                            instruction.to <= parent.to
                        )
                            clearedInstructions.conditionalRemove(
                                (i) => i == instruction
                            );

    return clearedInstructions;
}

let defaultRules = [
    {
        type: "function-highlighting",
        color: "rgb(230,230,170)",
        preFuncs: " ,./+_*&^%@!=-;|<>?()[]{}\n".split(""),
        postFunc: "(",
        priority: 0,
    },
    {
        type: "word-highlighting",
        hashmap: {
            "rgb(120, 144, 235)": [
                "this",
                "const",
                "let",
                "function",
                "of",
                "=>",
            ],
            "rgb(189, 109, 214)": [
                "for",
                "return",
                "while",
                "do",
                "if",
                "break",
            ],
            "rgb(110, 154, 235)": ["false", "true"],
        },
        wordSeps: " ,/+_)(*&^%@!=[]{}';|<>?\n".split(""),
        priority: 1,
    },
    {
        type: "word-highlighting",
        hashmap: {
            "rgb(199, 242, 175)": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
            lightGrey: ",./+*&^%@!=-;|<>?".split(""),
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
                priority: 2,
            },
            {
                color: "rgb(225, 140, 125)",
                enclosureStart: '"',
                enclosureEnd: '"',
                priority: 2,
            },
            {
                color: "rgb(80,130,0)",
                enclosureStart: "//",
                enclosureEnd: "\n",
                priority: 3,
            },
        ],
    },
    {
        type: "variable-declaration",
        color: "rgb(90, 184, 255)",
        declarators: ["const"],
        declaratorsStarts: " ;[](){}\n".split(""),
        declaratorsEnds: [" "],
        declarationEnds: [";", " ", "="],
        wordBefores: " ,./+_*&^%@!=-;|<>?()[]{}\n".split(""),
        wordAfters: " ,./+_*&^%@!=-;|<>?\n".split(""),
        priority: 0,
    },
    {
        type: "variable-declaration",
        color: "rgb(230,230,170)",
        declarators: ["function"],
        declaratorsStarts: " ;[](){}\n".split(""),
        declaratorsEnds: [" "],
        declarationEnds: ["(", " ", "\n"],
        wordBefores: " ,./+_*&^%@!=-;|<>?()[]{}\n".split(""),
        wordAfters: " ,./+_*&^%@!=-;|<>?\n".split(""),
        priority: 0,
    },
];

function GENERATE_HIGHLIGHTER(rules = defaultRules) {
    function HIGHLIGHT(txt) {
        let instructions = [];

        // generate rules dynamicly to color vairables for instance

        let newRules = [];
        for (const rule of rules) {
            if (rule.type === "variable-declaration") {
                newRules.push(getDynamicNewRule(txt, rule));
            }
        }

        for (const rule of rules) {
            if (rule.type === "word-highlighting") {
                instructions.push(...getWordsInstructions(txt, rule));
            }
            if (rule.type === "enclosure-highlighting") {
                instructions.push(
                    ...getEnclosureArrInstructions(txt, rule.enclosures)
                );
            }
            if (rule.type === "function-highlighting") {
                instructions.push(...getFunctionInstructions(txt, rule));
            }
        }
        if (newRules[0])
            for (const rule of newRules) {
                if (rule.type === "word-highlighting") {
                    instructions.push(...getWordsInstructions(txt, rule));
                }
                if (rule.type === "enclosure-highlighting") {
                    instructions.push(
                        ...getEnclosureArrInstructions(txt, rule.enclosures)
                    );
                }
            }

        ///////// default settings ///////////

        if (
            !rules.some((r) => r.type === "HTML-line-jumps" && r.set == false)
        ) {
            instructions.push(...getLineJumpsInstrunctions(txt, 4));
        }

        if (!rules.some((r) => r.type === "HTML-spaces" && r.set == false)) {
            instructions.push(...getSpacesInstructions(txt, 4));
        }

        if (!rules.some((r) => r.type === "HTML-less-than" && r.set == false)) {
            instructions.push(...getLessThanInstructions(txt, 4));
        }

        // remove instructions enclosed by higher priority tags
        instructions = handlePriorities(instructions);

        log(instructions);

        return generateHTML(txt, instructions);
    }

    return HIGHLIGHT;
}