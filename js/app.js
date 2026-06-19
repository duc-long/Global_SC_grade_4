document.addEventListener('DOMContentLoaded', async () => {
    const screens = {
        loading: document.getElementById('loading'),
        home: document.getElementById('home-screen'),
        learning: document.getElementById('learning-screen'),
        completion: document.getElementById('completion-screen'),
        game_over: document.getElementById('game-over-screen')
    };

    const roadmapContainer = document.getElementById('roadmap-container');
    const roadmapSvg = document.getElementById('roadmap-svg');
    const roadmapPath = document.getElementById('roadmap-path');
    const roadmapPathUnlocked = document.getElementById('roadmap-path-unlocked');
    
    const dashStreak = document.getElementById('dash-streak');
    const dashXp = document.getElementById('dash-xp');
    const dashWords = document.getElementById('dash-words');

    const learningProgressBar = document.getElementById('learning-progress-bar');
    const currentUnitTitle = document.getElementById('current-unit-title');
    const completedUnitName = document.getElementById('completed-unit-name');
    const livesContainer = document.getElementById('lives-container');
    
    const phaseFlashcard = document.getElementById('phase-flashcard');
    const phaseCopy = document.getElementById('phase-copy');
    const phaseQuiz = document.getElementById('phase-quiz');
    const phaseMatch = document.getElementById('phase-match');
    const phaseSpelling = document.getElementById('phase-spelling');

    const copyTimerDisplay = document.getElementById('copy-timer');
    const copyWordList = document.getElementById('copy-word-list');
    const btnFinishCopy = document.getElementById('btn-finish-copy');

    const flashcard = document.getElementById('flashcard');
    const fcWord = document.getElementById('fc-word');
    const fcPhonetic = document.getElementById('fc-phonetic');
    const fcType = document.getElementById('fc-type');
    const fcMeaning = document.getElementById('fc-meaning');
    const btnFlip = document.getElementById('btn-flip');
    const btnNextFlashcard = document.getElementById('btn-next-flashcard');
    const btnAudio = document.getElementById('btn-audio');

    const quizQuestion = document.getElementById('quiz-question');
    const quizWordDisplay = document.getElementById('quiz-word-display');
    const quizAudioControls = document.getElementById('quiz-audio-controls');
    const btnQuizAudio = document.getElementById('btn-quiz-audio');
    const quizOptionsContainer = document.getElementById('quiz-options');
    const quizFeedback = document.getElementById('quiz-feedback');
    const feedbackIcon = document.getElementById('feedback-icon');
    const btnNextQuiz = document.getElementById('btn-next-quiz');

    const matchGrid = document.getElementById('match-grid');
    
    const spellingMeaning = document.getElementById('spelling-meaning');
    const btnSpellingAudio = document.getElementById('btn-spelling-audio');
    const spellingSlots = document.getElementById('spelling-slots');
    const spellingLetters = document.getElementById('spelling-letters');

    const btnBackLearning = document.getElementById('btn-back-learning');
    const btnFinishLearning = document.getElementById('btn-finish-learning');
    const btnRestartLearning = document.getElementById('btn-restart-learning');
    const btnQuitLearning = document.getElementById('btn-quit-learning');
    const btnHint = document.getElementById('btn-hint');

    let currentLesson = null;
    let learningQueue = [];
    let quizQueue = [];
    let currentQuizItem = null;
    let totalItemsInLesson = 0;
    let itemsCompleted = 0;
    let currentLives = 3;
    let copyTimerInterval = null;
    let comboCount = 0;

    function updateCombo(isCorrect) {
        if (isCorrect) {
            comboCount++;
            if (comboCount === 3) {
                learningProgressBar.classList.add('on-fire');
                if (typeof Confetti !== 'undefined') Confetti.fire();
            }
        } else {
            comboCount = 0;
            learningProgressBar.classList.remove('on-fire');
        }
    }

    await DataService.loadData();
    updateDashboard();
    renderRoadmap();
    history.replaceState({ screen: 'home' }, '', '#home');
    showScreen('home', false);
    
    window.addEventListener('resize', () => {
        if(screens.home.classList.contains('active')) drawRoadmapPath();
    });

    window.addEventListener('popstate', (event) => {
        const state = event.state;
        if (state && state.screen) {
            showScreen(state.screen, false);
        } else {
            showScreen('home', false);
        }
    });

    function showScreen(screenName, pushHistory = true) {
        Object.values(screens).forEach(s => s.classList.remove('active'));
        screens[screenName].classList.add('active');
        if (screenName === 'home') {
            setTimeout(drawRoadmapPath, 50);
        }
        if (pushHistory) {
            history.pushState({ screen: screenName }, '', `#${screenName}`);
        }
    }

    function shuffle(array) {
        let currentIndex = array.length, randomIndex;
        while (currentIndex !== 0) {
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex--;
            [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
        }
        return array;
    }

    function updateDashboard() {
        dashStreak.textContent = DataService.progress.streak;
        dashXp.textContent = DataService.progress.xp;
        dashWords.textContent = DataService.progress.wordsLearned;
    }

    function updateProgressBar() {
        const percent = (itemsCompleted / totalItemsInLesson) * 100;
        learningProgressBar.style.width = `${percent}%`;
    }

    function updateLivesUI() {
        if (!livesContainer) return;
        const hearts = livesContainer.querySelectorAll('i');
        hearts.forEach((h, i) => {
            if (i < currentLives) {
                h.className = 'fa-solid fa-heart';
            } else {
                h.className = 'fa-solid fa-heart lost';
            }
        });
        if (currentLives <= 1) {
            btnHint.disabled = true;
        } else {
            btnHint.disabled = false;
        }
    }

    function decreaseLife() {
        if (currentLives > 0) {
            currentLives--;
            updateLivesUI();
            SoundEffects.playWrong();
            document.body.classList.add('shake');
            setTimeout(() => document.body.classList.remove('shake'), 400);
            
            if (currentLives === 0) {
                setTimeout(() => {
                    SoundEffects.playGameOver();
                    showScreen('game_over');
                }, 500);
                return true;
            }
        }
        return false;
    }

    // --- ROADMAP ---
    function renderRoadmap() {
        roadmapContainer.innerHTML = '';
        
        const pattern = [0, 40, 80, 40, 0, -40, -80, -40]; 
        
        // Group lessons by Unit
        const unitsMap = {};
        DataService.lessons.forEach(l => {
            if (!unitsMap[l.unitId]) unitsMap[l.unitId] = [];
            unitsMap[l.unitId].push(l);
        });

        let globalIndex = 0;

        if (DataService.progress.weakWords && DataService.progress.weakWords.length >= 5) {
            const island = document.createElement('div');
            island.className = 'unit-island';
            const title = document.createElement('div');
            title.className = 'unit-island-title';
            title.textContent = `Trạm Cứu Thương`;
            island.appendChild(title);

            const row = document.createElement('div');
            row.className = 'roadmap-row';

            const node = document.createElement('div');
            node.className = 'roadmap-node node-healing';
            node.innerHTML = '<i class="fa-solid fa-truck-medical"></i>';
            node.style.transform = `translateX(0px)`;
            
            // Healing station acts as a boss node with spelling bee
            node.addEventListener('click', () => startHealingLesson());
            node.addEventListener('mouseenter', () => node.style.transform = `scale(1.1)`);
            node.addEventListener('mouseleave', () => node.style.transform = `scale(1)`);

            row.appendChild(node);
            island.appendChild(row);
            roadmapContainer.appendChild(island);
            globalIndex++;
        }

        Object.keys(unitsMap).forEach(unitId => {
            const lessons = unitsMap[unitId];
            
            // Create an Island for this Unit
            const island = document.createElement('div');
            island.className = 'unit-island';
            
            const title = document.createElement('div');
            title.className = 'unit-island-title';
            title.textContent = `Unit ${unitId}: ${DataService.vocabData.find(u => u.id == unitId)?.title || ''}`;
            island.appendChild(title);

            lessons.forEach(lesson => {
                const isUnlocked = DataService.isLessonUnlocked(lesson.id);
                const isCompleted = DataService.isLessonCompleted(lesson.id);
                
                const row = document.createElement('div');
                row.className = 'roadmap-row';

                const node = document.createElement('div');
                
                if (lesson.isBoss) {
                    node.className = `roadmap-node boss-node ${isUnlocked ? 'node-unlocked' : 'node-locked'}`;
                    node.innerHTML = isCompleted ? '<i class="fa-solid fa-star"></i>' : (isUnlocked ? '<i class="fa-solid fa-crown"></i>' : '<i class="fa-solid fa-lock"></i>');
                } else {
                    node.className = `roadmap-node ${isUnlocked ? 'node-unlocked' : 'node-locked'}`;
                    node.innerHTML = isCompleted ? '<i class="fa-solid fa-star"></i>' : (isUnlocked ? '<i class="fa-solid fa-play"></i>' : '<i class="fa-solid fa-lock"></i>');
                }

                const offsetX = pattern[globalIndex % pattern.length];
                node.style.transform = `translateX(${offsetX}px)`;
                
                // Keep data for SVG routing. Only connect nodes within the same unit.
                node.dataset.unlocked = isUnlocked;
                node.dataset.unitId = unitId; 
                
                const label = document.createElement('div');
                label.className = 'node-label';
                label.textContent = lesson.isBoss ? 'Tổng Ôn' : `P.${lesson.chunkIndex + 1}`;
                node.appendChild(label);

                if (isUnlocked) {
                    node.addEventListener('click', () => startLesson(lesson.id));
                    node.addEventListener('mouseenter', () => node.style.transform = `translateX(${offsetX}px) scale(1.1)`);
                    node.addEventListener('mouseleave', () => node.style.transform = `translateX(${offsetX}px) scale(1)`);
                } else {
                    node.addEventListener('mouseenter', () => node.style.transform = `translateX(${offsetX}px) scale(1.05)`);
                    node.addEventListener('mouseleave', () => node.style.transform = `translateX(${offsetX}px) scale(1)`);
                }

                row.appendChild(node);
                island.appendChild(row);
                globalIndex++;
            });
            
            roadmapContainer.appendChild(island);
        });
        
        setTimeout(drawRoadmapPath, 100);
    }

    function drawRoadmapPath() {
        const wrapperRect = document.getElementById('roadmap-wrapper').getBoundingClientRect();
        roadmapSvg.style.height = `${wrapperRect.height}px`;
        
        const nodes = document.querySelectorAll('.roadmap-node');
        if (nodes.length < 2) return;

        let fullPath = '';
        let unlockedPath = '';

        for (let i = 0; i < nodes.length - 1; i++) {
            const n1 = nodes[i];
            const n2 = nodes[i+1];
            
            // Do not draw lines between different units
            if (n1.dataset.unitId !== n2.dataset.unitId) {
                continue; 
            }
            
            const r1 = n1.getBoundingClientRect();
            const r2 = n2.getBoundingClientRect();
            
            const x1 = (r1.left - wrapperRect.left) + (r1.width / 2);
            const y1 = (r1.top - wrapperRect.top) + (r1.height / 2);
            
            const x2 = (r2.left - wrapperRect.left) + (r2.width / 2);
            const y2 = (r2.top - wrapperRect.top) + (r2.height / 2);

            const cp1x = x1;
            const cp1y = y1 + (y2 - y1) / 2;
            const cp2x = x2;
            const cp2y = y1 + (y2 - y1) / 2;

            // Start new M command if it's the first node of an island, else continue with C
            let command = `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`;
            
            // If the previous line was drawn, we don't necessarily need M, but M is safe and ensures path resets correctly
            fullPath += command + ' ';
            
            if (n2.dataset.unlocked === 'true' || n1.innerHTML.includes('fa-star')) {
                unlockedPath += command + ' ';
            }
        }

        roadmapPath.setAttribute('d', fullPath);
        roadmapPathUnlocked.setAttribute('d', unlockedPath);
    }

    // --- LEARNING FLOW ---
    function startHealingLesson() {
        if (!DataService.progress.weakWords || DataService.progress.weakWords.length === 0) return;
        currentLesson = { id: 'healing', isBoss: false, title: 'Trạm Phục Hồi Ký Ức' };
        currentUnitTitle.textContent = currentLesson.title;
        
        learningQueue = [];
        quizQueue = [];
        let pool = [...DataService.progress.weakWords];
        shuffle(pool);
        pool.slice(0, 10).forEach(w => {
            quizQueue.push({ type: 'spelling_bee', wordData: w });
            quizQueue.push({ type: 'word_to_meaning', wordData: w });
        });
        
        currentLives = 3;
        comboCount = 0;
        learningProgressBar.classList.remove('on-fire');
        updateLivesUI();
        totalItemsInLesson = quizQueue.length;
        itemsCompleted = 0;
        updateProgressBar();
        quizFeedback.classList.remove('active');
        showScreen('learning');
        startQuizPhase();
    }

    function startLesson(lessonId) {
        currentLesson = DataService.getLessonById(lessonId);
        if (!currentLesson || currentLesson.words.length === 0) return;
        
        currentUnitTitle.textContent = currentLesson.title;
        currentLives = 3;
        comboCount = 0;
        learningProgressBar.classList.remove('on-fire');
        updateLivesUI();
        
        if (currentLesson.isBoss) {
            learningQueue = [];
            let wordsPool = [...currentLesson.words];
            shuffle(wordsPool);
            let selectedWords = wordsPool.slice(0, 15);
            
            quizQueue = [];
            selectedWords.forEach(w => {
                const rand = Math.random();
                if (rand < 0.33) quizQueue.push({ type: 'spelling_bee', wordData: w });
                else if (rand < 0.66) quizQueue.push({ type: 'word_to_meaning', wordData: w });
                else quizQueue.push({ type: 'listen_to_meaning', wordData: w });
            });
        } else {
            learningQueue = [...currentLesson.words]; 
            quizQueue = [];
            
            let group1 = []; // word_to_meaning
            let group3 = []; // listen_to_meaning
            let group4 = []; // spelling_bee

            currentLesson.words.forEach(w => {
                group1.push({ type: 'word_to_meaning', wordData: w });
                group3.push({ type: 'listen_to_meaning', wordData: w });
                group4.push({ type: 'spelling_bee', wordData: w });
            });
            shuffle(group1);
            shuffle(group3);
            shuffle(group4);

            quizQueue.push(...group1);

            // Add a Match Pairs game using 4 words from this lesson
            if (currentLesson.words.length >= 4) {
                let chunk = [...currentLesson.words];
                shuffle(chunk);
                quizQueue.push({ type: 'match_pairs', wordsData: chunk.slice(0, 4) });
            }

            quizQueue.push(...group3);
            quizQueue.push(...group4);
        }

        totalItemsInLesson = learningQueue.length + quizQueue.length;
        itemsCompleted = 0;
        updateProgressBar();
        quizFeedback.classList.remove('active');

        showScreen('learning');
        
        if (currentLesson.isBoss) {
            startQuizPhase();
        } else {
            showNextFlashcard();
        }
    }

    function showNextFlashcard() {
        if (learningQueue.length === 0) {
            // Check if it's the first time learning this non-boss lesson
            if (!currentLesson.isBoss && !DataService.isLessonCompleted(currentLesson.id)) {
                startCopyPhase();
            } else {
                startQuizPhase();
            }
            return;
        }

        phaseQuiz.classList.remove('active');
        phaseCopy.classList.remove('active');
        phaseMatch.classList.remove('active');
        phaseSpelling.classList.remove('active');
        btnHint.style.display = 'none';
        phaseFlashcard.classList.add('active');
        flashcard.classList.remove('flipped');

        const wordData = learningQueue[0];
        fcWord.textContent = wordData.word;
        fcPhonetic.textContent = wordData.phonetic || '';
        fcType.textContent = wordData.type || '';
        fcMeaning.textContent = wordData.meaning;

        setTimeout(() => AudioService.playWord(wordData.word), 300);
    }

    btnNextFlashcard.addEventListener('click', () => {
        learningQueue.shift(); 
        itemsCompleted++;
        updateProgressBar();
        showNextFlashcard();
    });

    // --- COPY PHASE ---
    function startCopyPhase() {
        btnHint.style.display = 'none';
        phaseFlashcard.classList.remove('active');
        phaseCopy.classList.add('active');
        
        // Populate word list
        copyWordList.innerHTML = '';
        currentLesson.words.forEach(w => {
            const li = document.createElement('li');
            li.innerHTML = `<span class="copy-word-en">${w.word} <span style="font-size:14px;color:var(--text-light)">(${w.type || ''})</span></span><span class="copy-word-vi">${w.meaning}</span>`;
            copyWordList.appendChild(li);
        });

        // Start timer
        let timeLeft = 15 * 60; // 15 minutes
        copyTimerDisplay.textContent = formatTime(timeLeft);
        
        clearInterval(copyTimerInterval);
        copyTimerInterval = setInterval(() => {
            timeLeft--;
            copyTimerDisplay.textContent = formatTime(timeLeft);
            if (timeLeft <= 0) {
                finishCopyPhase();
            }
        }, 1000);
    }

    function formatTime(seconds) {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    }

    function finishCopyPhase() {
        clearInterval(copyTimerInterval);
        phaseCopy.classList.remove('active');
        startQuizPhase();
    }

    if (btnFinishCopy) {
        btnFinishCopy.addEventListener('click', finishCopyPhase);
    }

    // --- QUIZ FLOW ---
    function startQuizPhase() {
        phaseFlashcard.classList.remove('active');
        phaseQuiz.classList.add('active');
        showNextQuiz();
    }

    function showNextQuiz() {
        if (quizQueue.length === 0) {
            finishLesson();
            return;
        }

        quizFeedback.classList.remove('active', 'correct', 'incorrect');
        quizOptionsContainer.innerHTML = '';
        
        currentQuizItem = quizQueue[0];
        
        // Hide all quiz phases first
        phaseQuiz.classList.remove('active');
        phaseMatch.classList.remove('active');
        phaseSpelling.classList.remove('active');
        btnHint.style.display = 'none'; // hide by default, show in specific phases

        if (currentQuizItem.type === 'match_pairs') {
            phaseMatch.classList.add('active');
            renderMatchPairs(currentQuizItem.wordsData);
            return;
        } else if (currentQuizItem.type === 'spelling_bee') {
            phaseSpelling.classList.add('active');
            renderSpellingBee(currentQuizItem.wordData);
            return;
        }

        // Default quiz types
        phaseQuiz.classList.add('active');
        
        const correctWord = currentQuizItem.wordData;
        const uniqueMeanings = new Set([correctWord.meaning.toLowerCase().trim()]);
        let wrongOptions = [];
        
        let pool = [];
        if (currentLesson.id === 'healing') {
            pool = [...DataService.progress.weakWords];
        } else {
            const unit = DataService.vocabData.find(u => u.id === currentLesson.unitId);
            if (unit) pool = [...unit.words];
        }
        shuffle(pool);
        
        for (let w of pool) {
            let m = w.meaning.toLowerCase().trim();
            if (w.word !== correctWord.word && !uniqueMeanings.has(m)) {
                wrongOptions.push(w);
                uniqueMeanings.add(m);
                if (wrongOptions.length === 3) break;
            }
        }
        
        if (wrongOptions.length < 3) {
           let allWords = [];
           DataService.lessons.forEach(l => {
               if(!l.isBoss) allWords.push(...l.words);
           });
           shuffle(allWords);
           
           for (let w of allWords) {
               let m = w.meaning.toLowerCase().trim();
               if (w.word !== correctWord.word && !uniqueMeanings.has(m)) {
                   wrongOptions.push(w);
                   uniqueMeanings.add(m);
                   if (wrongOptions.length === 3) break;
               }
           }
        }

        let options = [correctWord, ...wrongOptions];
        shuffle(options);
        btnHint.style.display = 'block';

        if (currentQuizItem.type === 'word_to_meaning') {
            quizQuestion.textContent = currentLesson.isBoss ? "BOSS: Chọn nghĩa tiếng Việt đúng" : "Chọn nghĩa tiếng Việt đúng";
            quizWordDisplay.style.display = 'block';
            quizAudioControls.style.display = 'none';
            quizWordDisplay.textContent = correctWord.word;
            setTimeout(() => AudioService.playWord(correctWord.word), 200);

            options.forEach(opt => {
                const btn = document.createElement('button');
                btn.className = 'quiz-option-btn';
                btn.textContent = opt.meaning;
                btn.onclick = () => handleAnswer(opt.meaning, btn);
                quizOptionsContainer.appendChild(btn);
            });
        } 
        else if (currentQuizItem.type === 'listen_to_meaning') {
            quizQuestion.textContent = currentLesson.isBoss ? "BOSS: Nghe và chọn nghĩa" : "Nghe và chọn nghĩa tương ứng";
            quizWordDisplay.style.display = 'none';
            quizAudioControls.style.display = 'flex';
            setTimeout(() => AudioService.playWord(correctWord.word), 200);

            options.forEach(opt => {
                const btn = document.createElement('button');
                btn.className = 'quiz-option-btn';
                btn.textContent = opt.meaning;
                btn.onclick = () => handleAnswer(opt.meaning, btn);
                quizOptionsContainer.appendChild(btn);
            });
        }
    }

    function handleAnswer(selectedMeaning, btnElement) {
        const isCorrect = selectedMeaning === currentQuizItem.wordData.meaning;
        
        // Disable all options
        const allBtns = document.querySelectorAll('.quiz-option-btn');
        allBtns.forEach(btn => {
            btn.disabled = true;
            btn.style.cursor = 'default';
        });

        if (isCorrect) {
            SoundEffects.playCorrect();
            btnElement.classList.add('correct');
            feedbackIcon.innerHTML = '<i class="fa-solid fa-circle-check"></i> Chính xác!';
            quizFeedback.className = 'quiz-feedback active correct';
            updateCombo(true);
        } else {
            DataService.addWeakWord(currentQuizItem.wordData);
            updateCombo(false);
            const isDead = decreaseLife();
            
            btnElement.classList.add('incorrect');
            quizOptionsContainer.classList.add('shake');
            setTimeout(() => quizOptionsContainer.classList.remove('shake'), 500);
            
            feedbackIcon.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> Sai rồi! Đáp án: ${currentQuizItem.wordData.meaning}`;
            quizFeedback.className = 'quiz-feedback active incorrect';
            quizQueue.push(currentQuizItem);
        }
    }

    // --- MINIGAMES LOGIC ---
    function renderMatchPairs(wordsData) {
        btnHint.style.display = 'none';
        matchGrid.innerHTML = '';
        let enItems = [];
        let viItems = [];
        wordsData.forEach(w => {
            enItems.push({ text: w.word, type: 'en', id: w.word });
            viItems.push({ text: w.meaning, type: 'vi', id: w.word });
        });
        shuffle(enItems);
        shuffle(viItems);

        let items = [];
        for (let i = 0; i < enItems.length; i++) {
            items.push(enItems[i]);
            items.push(viItems[i]);
        }

        let selected = null;
        let matchedCount = 0;

        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'match-item';
            div.textContent = item.text;
            
            div.addEventListener('click', () => {
                if (div.classList.contains('matched') || div === selected) return;
                
                if (!selected) {
                    selected = div;
                    div.classList.add('selected');
                } else {
                    if (selected.dataset.type !== item.type && selected.dataset.id === item.id) {
                        // Match
                        SoundEffects.playCorrect();
                        div.classList.add('matched');
                        selected.classList.remove('selected');
                        selected.classList.add('matched');
                        matchedCount += 2;
                        updateCombo(true);
                        
                        if (matchedCount === items.length) {
                            setTimeout(() => {
                                quizQueue.shift();
                                itemsCompleted++;
                                updateProgressBar();
                                showNextQuiz();
                            }, 600);
                        }
                    } else {
                        // Wrong
                        div.classList.add('wrong');
                        selected.classList.add('wrong');
                        selected.classList.remove('selected');
                        
                        // We need the original wordData to record weak word
                        const wrongWordData = wordsData.find(w => w.word === item.id || w.word === selected.dataset.id);
                        if (wrongWordData) DataService.addWeakWord(wrongWordData);
                        
                        updateCombo(false);
                        const isDead = decreaseLife();
                        if (isDead) return;

                        setTimeout(() => {
                            div.classList.remove('wrong');
                            if(selected) selected.classList.remove('wrong');
                        }, 500);
                    }
                    selected = null;
                }
            });
            
            div.dataset.id = item.id;
            div.dataset.type = item.type;
            matchGrid.appendChild(div);
        });
    }

    function renderSpellingBee(wordData) {
        btnHint.style.display = 'block';
        spellingMeaning.textContent = wordData.meaning;
        spellingSlots.innerHTML = '';
        spellingLetters.innerHTML = '';
        
        const wordUpper = wordData.word.toUpperCase();
        let filledCount = 0;

        // Create empty slots
        for (let i = 0; i < wordUpper.length; i++) {
            const char = wordUpper[i];
            const slot = document.createElement('div');
            slot.className = 'spelling-slot';
            slot.dataset.index = i;
            
            if (char === ' ' || char === '-') {
                slot.textContent = char;
                slot.classList.add('pre-filled');
                slot.style.borderBottom = 'none';
                filledCount++;
            } else {
                slot.addEventListener('click', () => {
                    if (slot.textContent && !slot.classList.contains('pre-filled')) {
                        // return letter
                        const letterBtnId = slot.dataset.sourceId;
                        if (letterBtnId) {
                            document.getElementById(letterBtnId).classList.remove('used');
                            slot.textContent = '';
                            slot.dataset.sourceId = '';
                            filledCount--;
                        }
                    }
                });
            }
            spellingSlots.appendChild(slot);
        }

        // Create letter buttons
        let letters = wordUpper.split('').filter(c => c !== ' ' && c !== '-');
        shuffle(letters);

        letters.forEach((char, idx) => {
            const btn = document.createElement('div');
            btn.className = 'spelling-letter';
            btn.id = `spell-letter-${idx}`;
            btn.textContent = char;
            
            btn.addEventListener('click', () => {
                if (btn.classList.contains('used')) return;
                
                // Find first empty slot
                const emptySlot = Array.from(spellingSlots.children).find(s => !s.textContent && !s.classList.contains('pre-filled'));
                if (emptySlot) {
                    emptySlot.textContent = char;
                    emptySlot.dataset.sourceId = btn.id;
                    btn.classList.add('used');
                    filledCount++;
                    
                    if (filledCount === wordUpper.length) {
                        checkSpellingBee(wordUpper, wordData);
                    }
                }
            });
            spellingLetters.appendChild(btn);
        });
        
        setTimeout(() => AudioService.playWord(wordData.word), 200);
        
        btnSpellingAudio.onclick = () => {
            AudioService.playWord(wordData.word);
        };
    }

    function checkSpellingBee(correctWordUpper, wordData) {
        const slots = Array.from(spellingSlots.children);
        const letters = Array.from(spellingLetters.children);
        const currentSpelling = slots.map(s => s.textContent).join('');

        // Disable all letters & slots to prevent clicking during check
        slots.forEach(s => s.style.pointerEvents = 'none');
        letters.forEach(b => b.style.pointerEvents = 'none');

        // Color coding feedback
        slots.forEach((s, i) => {
            if (s.textContent === correctWordUpper[i]) {
                s.style.backgroundColor = 'var(--success)';
                s.style.borderColor = 'var(--success)';
                s.style.color = 'white';
            } else {
                s.style.backgroundColor = 'var(--warning)';
                s.style.borderColor = 'var(--warning)';
                s.style.color = 'white';
            }
        });

        if (currentSpelling === correctWordUpper) {
            SoundEffects.playCorrect();
            quizFeedback.className = 'quiz-feedback active correct';
            feedbackIcon.innerHTML = '<i class="fa-solid fa-circle-check"></i> Xuất sắc!';
            updateCombo(true);
        } else {
            DataService.addWeakWord(wordData);
            updateCombo(false);
            
            spellingSlots.classList.add('shake');
            setTimeout(() => {
                spellingSlots.classList.remove('shake');
            }, 600);

            quizFeedback.className = 'quiz-feedback active incorrect';
            feedbackIcon.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> Sai rồi! Chú ý màu sắc nhé.`;
            quizQueue.push(currentQuizItem);
        }
    }

    btnNextQuiz.addEventListener('click', () => {
        if (quizFeedback.classList.contains('correct')) {
            itemsCompleted++;
        }
        quizQueue.shift();
        updateProgressBar();
        quizFeedback.classList.remove('active');
        showNextQuiz();
    });

    btnQuizAudio.addEventListener('click', () => {
        if (currentQuizItem) {
            AudioService.playWord(currentQuizItem.wordData.word);
        }
    });

    // --- FINISH ---
    async function finishLesson() {
        const isFirstTime = await DataService.completeLesson(currentLesson.id);
        updateDashboard();
        
        if (currentLesson.isBoss) {
            completedUnitName.innerHTML = `XUẤT SẮC!<br>Đã vượt qua bài kiểm tra Unit ${currentLesson.unitId}`;
        } else {
            completedUnitName.textContent = currentLesson.title;
        }
        
        showScreen('completion');
        
        // Fire confetti!
        if (typeof Confetti !== 'undefined') {
            Confetti.fire();
            if (currentLesson.isBoss) {
                setTimeout(() => Confetti.fire(), 1000);
                setTimeout(() => Confetti.fire(), 2000);
            }
        }
    }

    // --- BINDINGS ---
    flashcard.addEventListener('click', () => flashcard.classList.toggle('flipped'));
    btnFlip.addEventListener('click', () => flashcard.classList.toggle('flipped'));
    
    btnAudio.addEventListener('click', (e) => {
        e.stopPropagation();
        const wordText = fcWord.textContent;
        AudioService.playWord(wordText);
    });

    btnBackLearning.addEventListener('click', () => showScreen('home'));
    
    btnFinishLearning.addEventListener('click', () => {
        renderRoadmap();
        showScreen('home');
    });

    btnRestartLearning.addEventListener('click', () => {
        if (currentLesson && currentLesson.id === 'healing') {
            startHealingLesson();
        } else if (currentLesson) {
            startLesson(currentLesson.id);
        } else {
            showScreen('home');
        }
    });

    btnQuitLearning.addEventListener('click', () => {
        renderRoadmap();
        showScreen('home');
    });

    // Hint Event
    btnHint.addEventListener('click', () => {
        if (currentLives <= 1) return; // Prevent suicide

        if (phaseQuiz.classList.contains('active')) {
            const btns = Array.from(quizOptionsContainer.querySelectorAll('.quiz-option-btn'));
            const wrongBtns = btns.filter(b => b.textContent !== currentQuizItem.wordData.meaning && b.style.pointerEvents !== 'none');
            if (wrongBtns.length > 0) {
                decreaseLife();
                const randomWrong = wrongBtns[Math.floor(Math.random() * wrongBtns.length)];
                randomWrong.style.opacity = '0.3';
                randomWrong.style.pointerEvents = 'none';
            }
        } else if (phaseSpelling.classList.contains('active')) {
            const slots = Array.from(spellingSlots.children);
            const emptySlotIndex = slots.findIndex(s => !s.textContent && !s.classList.contains('pre-filled'));
            if (emptySlotIndex !== -1) {
                const correctChar = currentQuizItem.wordData.word.toUpperCase()[emptySlotIndex];
                const letters = Array.from(spellingLetters.children);
                const correctBtn = letters.find(b => !b.classList.contains('used') && b.textContent === correctChar);
                if (correctBtn) {
                    decreaseLife();
                    correctBtn.click();
                }
            }
        }
    });

    // Speed Audio Bindings
    document.getElementById('btn-audio-slow').addEventListener('click', (e) => { e.stopPropagation(); AudioService.playWord(fcWord.textContent, 0.6); });
    document.getElementById('btn-audio-vslow').addEventListener('click', (e) => { e.stopPropagation(); AudioService.playWord(fcWord.textContent, 0.3); });

    document.getElementById('btn-quiz-audio-slow').addEventListener('click', (e) => { e.stopPropagation(); if(currentQuizItem) AudioService.playWord(currentQuizItem.wordData.word, 0.6); });
    document.getElementById('btn-quiz-audio-vslow').addEventListener('click', (e) => { e.stopPropagation(); if(currentQuizItem) AudioService.playWord(currentQuizItem.wordData.word, 0.3); });

    document.getElementById('btn-spelling-audio-slow').addEventListener('click', (e) => { e.stopPropagation(); if(currentQuizItem) AudioService.playWord(currentQuizItem.wordData.word, 0.6); });
    document.getElementById('btn-spelling-audio-vslow').addEventListener('click', (e) => { e.stopPropagation(); if(currentQuizItem) AudioService.playWord(currentQuizItem.wordData.word, 0.3); });
});
