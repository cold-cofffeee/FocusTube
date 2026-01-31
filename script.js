// ==================== GLOBAL STATE & YOUTUBE PLAYER ====================
let player = null;
let playerReady = false;
let currentCourseId = null;
let currentLessonId = null;
let saveInterval = null;

// ==================== LOCALSTORAGE MANAGER ====================
const Storage = {
    KEYS: {
        COURSES: 'focustube_courses',
        CURRENT_COURSE: 'focustube_current_course',
        CURRENT_LESSON: 'focustube_current_lesson',
        YOUTUBE_API_KEY: 'focustube_youtube_api_key'
    },

    getCourses() {
        const data = localStorage.getItem(this.KEYS.COURSES);
        return data ? JSON.parse(data) : [];
    },

    saveCourses(courses) {
        localStorage.setItem(this.KEYS.COURSES, JSON.stringify(courses));
    },

    getCurrentState() {
        return {
            courseId: localStorage.getItem(this.KEYS.CURRENT_COURSE),
            lessonId: localStorage.getItem(this.KEYS.CURRENT_LESSON)
        };
    },

    saveCurrentState(courseId, lessonId) {
        localStorage.setItem(this.KEYS.CURRENT_COURSE, courseId || '');
        localStorage.setItem(this.KEYS.CURRENT_LESSON, lessonId || '');
    },

    addCourse(course) {
        const courses = this.getCourses();
        courses.push(course);
        this.saveCourses(courses);
    },

    deleteCourse(courseId) {
        const courses = this.getCourses();
        const filtered = courses.filter(c => c.id !== courseId);
        this.saveCourses(filtered);
    },

    updateLesson(courseId, lessonId, updates) {
        const courses = this.getCourses();
        const course = courses.find(c => c.id === courseId);
        if (course) {
            const lesson = course.lessons.find(l => l.id === lessonId);
            if (lesson) {
                Object.assign(lesson, updates);
                this.saveCourses(courses);
            }
        }
    },

    getLesson(courseId, lessonId) {
        const courses = this.getCourses();
        const course = courses.find(c => c.id === courseId);
        if (course) {
            return course.lessons.find(l => l.id === lessonId);
        }
        return null;
    },

    getYouTubeApiKey() {
        return localStorage.getItem(this.KEYS.YOUTUBE_API_KEY) || '';
    },

    setYouTubeApiKey(key) {
        localStorage.setItem(this.KEYS.YOUTUBE_API_KEY, key);
    }
};

// ==================== URL PARSER ====================
const URLParser = {
    // Extract video ID from various YouTube URL formats
    extractVideoId(url) {
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
            /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) return match[1];
        }
        return null;
    },

    // Extract playlist ID
    extractPlaylistId(url) {
        const match = url.match(/[?&]list=([a-zA-Z0-9_-]+)/);
        return match ? match[1] : null;
    },

    // Determine URL type
    getUrlType(url) {
        if (this.extractPlaylistId(url)) return 'playlist';
        if (this.extractVideoId(url)) return 'video';
        return 'invalid';
    }
};

// ==================== YOUTUBE API INTEGRATION ====================
// This function is called by YouTube IFrame API when ready
window.onYouTubeIframeAPIReady = function() {
    playerReady = true;
    console.log('YouTube IFrame API ready');
    // Restore last session if available
    restoreSession();
};

// Create YouTube player
function createPlayer(videoId) {
    const container = document.getElementById('playerContainer');
    
    // Clear welcome screen
    container.innerHTML = '<div id="player"></div>';

    if (player && typeof player.loadVideoById === 'function') {
        player.loadVideoById(videoId);
    } else {
        player = new YT.Player('player', {
            height: '100%',
            width: '100%',
            videoId: videoId,
            playerVars: {
                'playsinline': 1,
                'rel': 0, // Disable related videos
                'modestbranding': 1, // Minimal YouTube branding
                'fs': 1, // Fullscreen button
                'iv_load_policy': 3, // Disable annotations
                'disablekb': 0, // Enable keyboard controls
                'origin': window.location.origin || window.location.protocol + '//' + window.location.host
            },
            events: {
                'onReady': onPlayerReady,
                'onStateChange': onPlayerStateChange
            }
        });
    }
}

// Player ready event
function onPlayerReady(event) {
    console.log('Player ready');
    
    // Try to resume from last position
    const lesson = Storage.getLesson(currentCourseId, currentLessonId);
    if (lesson && lesson.lastPosition > 0) {
        player.seekTo(lesson.lastPosition, true);
    }

    // Start periodic saving of progress
    startProgressSaving();
}

// Player state change event
function onPlayerStateChange(event) {
    // YT.PlayerState.ENDED = 0
    if (event.data === YT.PlayerState.ENDED) {
        handleVideoEnd();
    }
}

// Handle video end - mark as complete and advance
function handleVideoEnd() {
    if (currentCourseId && currentLessonId) {
        // Mark current lesson as completed
        Storage.updateLesson(currentCourseId, currentLessonId, {
            completed: true,
            lastPosition: 0
        });

        // Refresh UI
        renderCourses();

        // Auto-advance to next lesson
        setTimeout(() => {
            playNextLesson();
        }, 1000);
    }
}

// Start saving progress periodically
function startProgressSaving() {
    if (saveInterval) clearInterval(saveInterval);
    
    saveInterval = setInterval(() => {
        if (player && player.getCurrentTime && currentCourseId && currentLessonId) {
            try {
                const currentTime = player.getCurrentTime();
                if (currentTime > 0) {
                    Storage.updateLesson(currentCourseId, currentLessonId, {
                        lastPosition: currentTime
                    });
                }
            } catch (e) {
                console.error('Error saving progress:', e);
            }
        }
    }, 5000); // Save every 5 seconds
}

// Stop saving progress
function stopProgressSaving() {
    if (saveInterval) {
        clearInterval(saveInterval);
        saveInterval = null;
    }
}

// ==================== PLAYLIST FETCHING ====================
// Fetch playlist videos using YouTube Data API v3
async function fetchPlaylistVideos(playlistId) {
    const apiKey = Storage.getYouTubeApiKey();
    
    if (!apiKey) {
        throw new Error('YouTube API key not configured. Please add your API key in Settings.');
    }

    try {
        const videoIds = [];
        let nextPageToken = '';
        
        // Fetch all pages of the playlist (max 50 items per page)
        do {
            const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=50&playlistId=${playlistId}&key=${apiKey}${nextPageToken ? '&pageToken=' + nextPageToken : ''}`;
            
            const response = await fetch(url);
            
            if (!response.ok) {
                const error = await response.json();
                if (response.status === 403) {
                    throw new Error('Invalid API key or quota exceeded. Please check your YouTube API key.');
                } else if (response.status === 404) {
                    throw new Error('Playlist not found or is private.');
                } else {
                    throw new Error(error.error?.message || 'Failed to fetch playlist');
                }
            }

            const data = await response.json();
            
            // Extract video IDs
            if (data.items && Array.isArray(data.items)) {
                for (const item of data.items) {
                    const videoId = item.contentDetails?.videoId;
                    if (videoId && !videoIds.includes(videoId)) {
                        videoIds.push(videoId);
                    }
                }
            }
            
            nextPageToken = data.nextPageToken || '';
            
        } while (nextPageToken);

        if (videoIds.length > 0) {
            console.log(`✓ Successfully fetched ${videoIds.length} videos from playlist`);
            return videoIds;
        } else {
            throw new Error('No videos found in playlist');
        }
        
    } catch (error) {
        console.error('Playlist fetch error:', error);
        throw error;
    }
}

// ==================== COURSE MANAGEMENT ====================
function generateId() {
    return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

async function addCourse(title, urls) {
    const videoIds = [];
    const lessons = [];
    let hasPlaylist = false;

    // Process each URL
    for (const url of urls) {
        const trimmedUrl = url.trim();
        if (!trimmedUrl) continue;

        const type = URLParser.getUrlType(trimmedUrl);

        if (type === 'video') {
            const videoId = URLParser.extractVideoId(trimmedUrl);
            if (videoId && !videoIds.includes(videoId)) {
                videoIds.push(videoId);
                lessons.push({
                    id: videoId,
                    title: `Lesson ${lessons.length + 1}`,
                    completed: false,
                    skipped: false,
                    lastPosition: 0,
                    notes: []
                });
            }
        } else if (type === 'playlist') {
            hasPlaylist = true;
            const playlistId = URLParser.extractPlaylistId(trimmedUrl);
            
            try {
                // Show loading message
                const loadingMsg = document.createElement('div');
                loadingMsg.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#1a1a1a;padding:30px;border-radius:8px;z-index:9999;color:#f1f1f1;text-align:center;';
                loadingMsg.innerHTML = '<p>🔄 Fetching playlist videos...</p><p style="font-size:12px;color:#888;margin-top:10px;">This may take a moment</p>';
                document.body.appendChild(loadingMsg);
                
                const playlistVideoIds = await fetchPlaylistVideos(playlistId);
                
                // Remove loading message
                document.body.removeChild(loadingMsg);
                
                if (playlistVideoIds.length === 0) {
                    alert('⚠️ Unable to fetch playlist videos.\n\nThis might be due to:\n- Private playlist\n- CORS restrictions\n- Invalid playlist ID\n\nPlease try pasting individual video URLs instead.');
                } else {
                    // Add videos from playlist
                    for (const videoId of playlistVideoIds) {
                        if (!videoIds.includes(videoId)) {
                            videoIds.push(videoId);
                            lessons.push({
                                id: videoId,
                                title: `Lesson ${lessons.length + 1}`,
                                completed: false,
                                skipped: false,
                                lastPosition: 0,
                                notes: []
                            });
                        }
                    }
                }
            } catch (error) {
                alert('❌ Error fetching playlist.\n\nPlease try pasting individual video URLs instead.');
                console.error('Playlist error:', error);
            }
        }
    }

    if (lessons.length === 0) {
        if (hasPlaylist) {
            alert('No videos were extracted from the playlist.\n\nPlease try pasting individual video URLs instead.');
        } else {
            alert('No valid YouTube video URLs found.\n\nPlease paste valid YouTube video URLs or playlists.');
        }
        return false;
    }

    // Create course object
    const course = {
        id: generateId(),
        title: title || `Course ${Storage.getCourses().length + 1}`,
        lessons: lessons,
        createdAt: Date.now()
    };

    // Save to storage
    Storage.addCourse(course);

    // Refresh UI
    renderCourses();

    // Auto-play first lesson of new course
    playLesson(course.id, lessons[0].id);

    return true;
}

function deleteCourse(courseId) {
    if (confirm('Are you sure you want to delete this course?')) {
        Storage.deleteCourse(courseId);
        
        // If deleted course was current, clear player
        if (currentCourseId === courseId) {
            currentCourseId = null;
            currentLessonId = null;
            Storage.saveCurrentState(null, null);
            
            if (player) {
                player.stopVideo();
            }
            
            const container = document.getElementById('playerContainer');
            container.innerHTML = `
                <div class="welcome-screen">
                    <h2>Course Deleted</h2>
                    <p>Select another course or add a new one</p>
                </div>
            `;
            
            document.getElementById('videoInfo').style.display = 'none';
        }
        
        renderCourses();
    }
}

// ==================== PLAYBACK CONTROL ====================
function playLesson(courseId, lessonId) {
    currentCourseId = courseId;
    currentLessonId = lessonId;
    
    // Save current state
    Storage.saveCurrentState(courseId, lessonId);

    // Update UI
    renderCourses();
    updateVideoInfo();

    // Create or update player
    if (playerReady) {
        createPlayer(lessonId);
    } else {
        // Wait for API to be ready
        setTimeout(() => playLesson(courseId, lessonId), 500);
    }
}

function playNextLesson() {
    if (!currentCourseId || !currentLessonId) return;

    const courses = Storage.getCourses();
    const course = courses.find(c => c.id === currentCourseId);
    
    if (!course) return;

    const currentIndex = course.lessons.findIndex(l => l.id === currentLessonId);
    if (currentIndex < course.lessons.length - 1) {
        const nextLesson = course.lessons[currentIndex + 1];
        playLesson(currentCourseId, nextLesson.id);
    } else {
        alert('Course completed! 🎉');
    }
}

function playPreviousLesson() {
    if (!currentCourseId || !currentLessonId) return;

    const courses = Storage.getCourses();
    const course = courses.find(c => c.id === currentCourseId);
    
    if (!course) return;

    const currentIndex = course.lessons.findIndex(l => l.id === currentLessonId);
    if (currentIndex > 0) {
        const prevLesson = course.lessons[currentIndex - 1];
        playLesson(currentCourseId, prevLesson.id);
    }
}

function markCurrentComplete() {
    if (currentCourseId && currentLessonId) {
        Storage.updateLesson(currentCourseId, currentLessonId, {
            completed: true,
            skipped: false
        });
        renderCourses();
    }
}

function markCurrentSkipped() {
    if (currentCourseId && currentLessonId) {
        Storage.updateLesson(currentCourseId, currentLessonId, {
            skipped: true,
            completed: false
        });
        renderCourses();
    }
}

// ==================== NOTES MANAGEMENT ====================
function addNote() {
    if (!currentCourseId || !currentLessonId || !player) return;

    const noteText = document.getElementById('noteInput').value.trim();
    if (!noteText) {
        alert('Please enter a note');
        return;
    }

    const currentTime = player.getCurrentTime ? player.getCurrentTime() : 0;
    const lesson = Storage.getLesson(currentCourseId, currentLessonId);
    
    if (lesson) {
        const notes = lesson.notes || [];
        notes.push({
            id: generateId(),
            text: noteText,
            timestamp: currentTime,
            createdAt: Date.now()
        });

        Storage.updateLesson(currentCourseId, currentLessonId, { notes });
        document.getElementById('noteInput').value = '';
        renderNotes();
    }
}

function deleteNote(noteId) {
    if (!currentCourseId || !currentLessonId) return;

    const lesson = Storage.getLesson(currentCourseId, currentLessonId);
    if (lesson) {
        const notes = (lesson.notes || []).filter(n => n.id !== noteId);
        Storage.updateLesson(currentCourseId, currentLessonId, { notes });
        renderNotes();
    }
}

function seekToTimestamp(timestamp) {
    if (player && player.seekTo) {
        player.seekTo(timestamp, true);
        if (player.getPlayerState() !== YT.PlayerState.PLAYING) {
            player.playVideo();
        }
    }
}

function formatTimestamp(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hrs > 0) {
        return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function renderNotes() {
    const notesContainer = document.getElementById('notesList');
    
    if (!currentCourseId || !currentLessonId) {
        notesContainer.innerHTML = '<p class="empty-notes">No lesson selected</p>';
        return;
    }

    const lesson = Storage.getLesson(currentCourseId, currentLessonId);
    const notes = lesson?.notes || [];

    if (notes.length === 0) {
        notesContainer.innerHTML = '<p class="empty-notes">No notes yet. Add notes while watching!</p>';
        return;
    }

    notesContainer.innerHTML = notes.map(note => `
        <div class="note-item">
            <div class="note-header">
                <button class="note-timestamp" data-timestamp="${note.timestamp}" title="Jump to this time">
                    ⏱️ ${formatTimestamp(note.timestamp)}
                </button>
                <button class="delete-note-btn" data-note-id="${note.id}" title="Delete note">×</button>
            </div>
            <div class="note-text">${escapeHtml(note.text)}</div>
        </div>
    `).join('');
    
    // Add event listeners to note buttons
    document.querySelectorAll('.note-timestamp').forEach(btn => {
        btn.addEventListener('click', function() {
            seekToTimestamp(parseFloat(this.dataset.timestamp));
        });
    });
    
    document.querySelectorAll('.delete-note-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            deleteNote(this.dataset.noteId);
        });
    });
}

// ==================== UI RENDERING ====================
function renderCourses() {
    const courses = Storage.getCourses();
    const container = document.getElementById('courseList');

    if (courses.length === 0) {
        container.innerHTML = '<p class="empty-state">No courses yet. Add YouTube videos or playlists to get started.</p>';
        return;
    }

    container.innerHTML = courses.map(course => {
        const completedCount = course.lessons.filter(l => l.completed).length;
        const progress = `${completedCount}/${course.lessons.length}`;

        return `
            <div class="course-item">
                <div class="course-header" data-course-id="${course.id}">
                    <div>
                        <div class="course-title">${escapeHtml(course.title)}</div>
                        <div class="course-progress">${progress} lessons completed</div>
                    </div>
                    <button class="delete-course-btn" data-delete-course="${course.id}" title="Delete course">×</button>
                </div>
                <div class="lesson-list" id="lessons-${course.id}">
                    ${course.lessons.map((lesson, index) => {
                        const isActive = currentCourseId === course.id && currentLessonId === lesson.id;
                        const isCompleted = lesson.completed;
                        const isSkipped = lesson.skipped;
                        
                        return `
                            <div class="lesson-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${isSkipped ? 'skipped' : ''}" 
                                 data-course-id="${course.id}" data-lesson-id="${lesson.id}">
                                <div class="lesson-number">${index + 1}</div>
                                <div class="lesson-title">${escapeHtml(lesson.title)}</div>
                                ${isCompleted ? '<span class="lesson-completed">✓</span>' : ''}
                                ${isSkipped ? '<span class="lesson-skipped">⊘</span>' : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }).join('');
    
    // Add event listeners for course headers
    document.querySelectorAll('.course-header').forEach(header => {
        header.addEventListener('click', function(e) {
            if (!e.target.classList.contains('delete-course-btn')) {
                toggleCourse(this.dataset.courseId);
            }
        });
    });
    
    // Add event listeners for delete buttons
    document.querySelectorAll('.delete-course-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            deleteCourse(this.dataset.deleteCourse);
        });
    });
    
    // Add event listeners for lesson items
    document.querySelectorAll('.lesson-item').forEach(item => {
        item.addEventListener('click', function() {
            playLesson(this.dataset.courseId, this.dataset.lessonId);
        });
    });
}

function toggleCourse(courseId) {
    const lessonList = document.getElementById(`lessons-${courseId}`);
    if (lessonList) {
        lessonList.style.display = lessonList.style.display === 'none' ? 'block' : 'none';
    }
}

function updateVideoInfo() {
    const videoInfo = document.getElementById('videoInfo');
    const notesSection = document.getElementById('notesSection');
    const titleEl = document.getElementById('currentLessonTitle');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    if (!currentCourseId || !currentLessonId) {
        videoInfo.style.display = 'none';
        notesSection.style.display = 'none';
        return;
    }

    const courses = Storage.getCourses();
    const course = courses.find(c => c.id === currentCourseId);
    
    if (!course) {
        videoInfo.style.display = 'none';
        notesSection.style.display = 'none';
        return;
    }

    const currentIndex = course.lessons.findIndex(l => l.id === currentLessonId);
    const currentLesson = course.lessons[currentIndex];

    titleEl.textContent = currentLesson.title;
    videoInfo.style.display = 'block';
    notesSection.style.display = 'block';

    // Enable/disable prev/next buttons
    prevBtn.disabled = currentIndex === 0;
    nextBtn.disabled = currentIndex === course.lessons.length - 1;
    
    // Render notes for current lesson
    renderNotes();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== MODAL HANDLING ====================
function openModal() {
    document.getElementById('addCourseModal').classList.add('show');
    document.getElementById('courseTitle').value = '';
    document.getElementById('urlInput').value = '';
}

function closeModal() {
    document.getElementById('addCourseModal').classList.remove('show');
}

async function submitUrls() {
    const title = document.getElementById('courseTitle').value.trim();
    const urlText = document.getElementById('urlInput').value.trim();

    if (!urlText) {
        alert('Please paste at least one YouTube video URL.');
        return;
    }

    const urls = urlText.split('\n').filter(url => url.trim());
    
    if (urls.length === 0) {
        alert('Please paste at least one YouTube video URL.');
        return;
    }

    const success = await addCourse(title, urls);
    
    if (success) {
        closeModal();
    }
}

// ==================== SESSION RESTORATION ====================
function restoreSession() {
    const { courseId, lessonId } = Storage.getCurrentState();
    
    // Render courses first
    renderCourses();

    if (courseId && lessonId) {
        // Restore last played lesson
        playLesson(courseId, lessonId);
    }
}

// ==================== SETTINGS MANAGEMENT ====================
function openSettings() {
    const apiKey = Storage.getYouTubeApiKey();
    document.getElementById('apiKeyInput').value = apiKey;
    document.getElementById('settingsModal').classList.add('show');
}

function closeSettings() {
    document.getElementById('settingsModal').classList.remove('show');
}

function saveSettings() {
    const apiKey = document.getElementById('apiKeyInput').value.trim();
    Storage.setYouTubeApiKey(apiKey);
    alert('Settings saved successfully! ✓');
    closeSettings();
}

// Initialize API key on first load if not set
function initializeApiKey() {
    const apiKey = Storage.getYouTubeApiKey();
    if (!apiKey) {
        // Set the provided API key as default
        Storage.setYouTubeApiKey('AIzaSyAstRN5lomp3YrkJcZwe1HdJytKw-hjKVo');
        console.log('YouTube API key initialized');
    }
}

// ==================== EVENT LISTENERS ====================
document.addEventListener('DOMContentLoaded', () => {
    // Initialize API key
    initializeApiKey();
    
    // Modal controls
    document.getElementById('addCourseBtn').addEventListener('click', openModal);
    document.getElementById('closeModal').addEventListener('click', closeModal);
    document.getElementById('cancelBtn').addEventListener('click', closeModal);
    document.getElementById('submitUrlsBtn').addEventListener('click', submitUrls);
    
    // Settings modal
    document.getElementById('settingsBtn').addEventListener('click', openSettings);
    document.getElementById('closeSettingsModal').addEventListener('click', closeSettings);
    document.getElementById('cancelSettingsBtn').addEventListener('click', closeSettings);
    document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);

    // Video controls
    document.getElementById('prevBtn').addEventListener('click', playPreviousLesson);
    document.getElementById('nextBtn').addEventListener('click', playNextLesson);
    document.getElementById('markCompleteBtn').addEventListener('click', markCurrentComplete);
    document.getElementById('markSkippedBtn').addEventListener('click', markCurrentSkipped);
    
    // Notes controls
    document.getElementById('addNoteBtn').addEventListener('click', addNote);
    document.getElementById('noteInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            addNote();
        }
    });

    // Close modals on outside click
    document.getElementById('addCourseModal').addEventListener('click', (e) => {
        if (e.target.id === 'addCourseModal') {
            closeModal();
        }
    });
    
    document.getElementById('settingsModal').addEventListener('click', (e) => {
        if (e.target.id === 'settingsModal') {
            closeSettings();
        }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Don't trigger shortcuts when typing in input fields
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }

        switch(e.key) {
            case 'ArrowLeft':
                e.preventDefault();
                playPreviousLesson();
                break;
            case 'ArrowRight':
                e.preventDefault();
                playNextLesson();
                break;
            case ' ':
                e.preventDefault();
                if (player && player.getPlayerState) {
                    const state = player.getPlayerState();
                    if (state === YT.PlayerState.PLAYING) {
                        player.pauseVideo();
                    } else if (state === YT.PlayerState.PAUSED) {
                        player.playVideo();
                    }
                }
                break;
        }
    });

    // Initial render
    if (playerReady) {
        restoreSession();
    }
});

// ==================== CLEANUP ====================
// Save progress before page unload
window.addEventListener('beforeunload', () => {
    if (player && player.getCurrentTime && currentCourseId && currentLessonId) {
        try {
            const currentTime = player.getCurrentTime();
            if (currentTime > 0) {
                Storage.updateLesson(currentCourseId, currentLessonId, {
                    lastPosition: currentTime
                });
            }
        } catch (e) {
            console.error('Error saving progress on unload:', e);
        }
    }
    stopProgressSaving();
});
