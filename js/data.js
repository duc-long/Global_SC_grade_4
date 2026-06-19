const DB_NAME = 'EngFunDB';
const DB_VERSION = 1;

const DataService = {
    vocabData: [],
    lessons: [],
    progress: {
        id: 'user_progress',
        xp: 0,
        streak: 0,
        lastLoginDate: null,
        wordsLearned: 0,
        unlockedLessons: ["1-0"],
        completedLessons: [],
        weakWords: []
    },
    db: null,

    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onerror = (e) => reject("IndexedDB error: " + e.target.errorCode);
            request.onsuccess = (e) => {
                this.db = e.target.result;
                resolve();
            };
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('progress')) {
                    db.createObjectStore('progress', { keyPath: 'id' });
                }
            };
        });
    },

    async loadData() {
        try {
            await this.initDB();
            this.vocabData = typeof VOCAB_DATA !== 'undefined' ? VOCAB_DATA : [];
            this.processLessons();
            await this.loadProgress();
            await this.checkStreak();
            return this.lessons;
        } catch (error) {
            console.error('Error loading data:', error);
            return [];
        }
    },

    processLessons() {
        this.lessons = [];
        this.vocabData.forEach(unit => {
            const chunkSize = 5;
            let chunkIndex = 0;
            // Add normal parts
            for (let i = 0; i < unit.words.length; i += chunkSize) {
                const chunk = unit.words.slice(i, i + chunkSize);
                this.lessons.push({
                    id: `${unit.id}-${chunkIndex}`,
                    unitId: unit.id,
                    chunkIndex: chunkIndex,
                    isBoss: false,
                    title: `Unit ${unit.id}: ${unit.title} (Phần ${chunkIndex + 1})`,
                    words: chunk
                });
                chunkIndex++;
            }
            
            // Add BOSS node at the end of the unit
            this.lessons.push({
                id: `${unit.id}-boss`,
                unitId: unit.id,
                chunkIndex: chunkIndex,
                isBoss: true,
                title: `Kiểm tra Tổng Ôn Unit ${unit.id}`,
                words: unit.words // We will shuffle and take ~15 words dynamically in app.js
            });
        });
    },

    async loadProgress() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['progress'], 'readonly');
            const store = transaction.objectStore('progress');
            const request = store.get('user_progress');
            
            request.onsuccess = () => {
                if (request.result) {
                    this.progress = request.result;
                    if (!this.progress.weakWords) this.progress.weakWords = []; // Migration
                } else if (this.lessons.length > 0) {
                    this.progress.unlockedLessons = [this.lessons[0].id];
                    this.saveProgress();
                }
                resolve();
            };
            request.onerror = () => reject(request.error);
        });
    },

    async saveProgress() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['progress'], 'readwrite');
            const store = transaction.objectStore('progress');
            const request = store.put(this.progress);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    async checkStreak() {
        const todayStr = new Date().toDateString();
        if (this.progress.lastLoginDate === todayStr) {
            return;
        }

        if (this.progress.lastLoginDate) {
            const lastDate = new Date(this.progress.lastLoginDate);
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            
            if (lastDate.toDateString() === yesterday.toDateString()) {
                this.progress.streak += 1;
            } else {
                this.progress.streak = 1;
            }
        } else {
            this.progress.streak = 1;
        }

        this.progress.lastLoginDate = todayStr;
        await this.saveProgress();
    },

    async addXP(amount) {
        this.progress.xp += amount;
        await this.saveProgress();
    },

    async addWordsLearned(amount) {
        this.progress.wordsLearned += amount;
        await this.saveProgress();
    },

    async addWeakWord(wordData) {
        // Only add if not already in weakWords
        if (!this.progress.weakWords.find(w => w.word === wordData.word)) {
            this.progress.weakWords.push(wordData);
            await this.saveProgress();
        }
    },

    async removeWeakWord(wordStr) {
        this.progress.weakWords = this.progress.weakWords.filter(w => w.word !== wordStr);
        await this.saveProgress();
    },

    async completeLesson(lessonId) {
        let isFirstTimeCompleting = false;
        
        if (!this.progress.completedLessons.includes(lessonId)) {
            this.progress.completedLessons.push(lessonId);
            isFirstTimeCompleting = true;
            
            const lesson = this.getLessonById(lessonId);
            if (lesson && !lesson.isBoss) {
                this.progress.wordsLearned += lesson.words.length;
                this.progress.xp += 20;
            } else if (lesson && lesson.isBoss) {
                this.progress.xp += 50; // Boss gives more XP
            }
        }
        
        // Unlock next lesson
        const currentIndex = this.lessons.findIndex(l => l.id === lessonId);
        if (currentIndex !== -1 && currentIndex + 1 < this.lessons.length) {
            const nextLessonId = this.lessons[currentIndex + 1].id;
            if (!this.progress.unlockedLessons.includes(nextLessonId)) {
                this.progress.unlockedLessons.push(nextLessonId);
            }
        }
        
        await this.saveProgress();
        return isFirstTimeCompleting;
    },

    isLessonUnlocked(lessonId) {
        return this.progress.unlockedLessons.includes(lessonId);
    },
    
    isLessonCompleted(lessonId) {
        return this.progress.completedLessons.includes(lessonId);
    },

    getLessonById(id) {
        return this.lessons.find(l => l.id === id);
    }
};
