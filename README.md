# 📚 FocusTube

A distraction-free, PotPlayer-style YouTube course player. Transform YouTube videos and playlists into a focused learning environment with progress tracking, notes, and zero distractions.

## ✨ Features

### 🎯 Distraction-Free Learning
- **No End Screens**: Videos stop before YouTube's end screen appears
- **No Related Videos**: Zero recommendations or suggestions
- **No Comments**: Pure content focus
- **No Autoplay**: Full manual control over playback
- **Clean Interface**: Minimal, study-optimized dark theme

### 📚 Course Management
- **Playlist Support**: Paste YouTube playlist URLs and automatically import all videos
- **Single Videos**: Add individual videos as lessons
- **Multiple Courses**: Organize different learning topics separately
- **Course Progress**: Track completion percentage for each course
- **Smart Collapse**: Courses remember their expanded/collapsed state

### ⏱️ Progress Tracking
- **Auto-Resume**: Videos continue from where you left off
- **Completion Status**: Mark lessons as completed ✓
- **Skip Status**: Mark lessons as skipped ⊘
- **Real-time Save**: Progress saved every second
- **Session Persistence**: All data stored locally in browser

### 📝 Notes System
- **Timestamped Notes**: Take notes with automatic timestamps
- **Jump to Moment**: Click any note's timestamp to jump to that point in the video
- **Per-Lesson Notes**: Each lesson has its own notes collection
- **Quick Entry**: Press Ctrl+Enter to save notes quickly
- **Delete Notes**: Remove notes you don't need

### ⌨️ Keyboard Shortcuts
- `←` Arrow Left: Previous lesson
- `→` Arrow Right: Next lesson
- `Space`: Play/Pause video
- `Ctrl + Enter`: Save note (when in notes textarea)
- `F`: Fullscreen (when player is focused)

### 🎨 User Interface
- **Left Sidebar**: Course library with expandable lesson lists
- **Main Player**: Large, optimized video player (16:9 aspect ratio)
- **Video Controls**: Previous, Complete, Skip, Next buttons
- **Notes Section**: Add and manage timestamped notes below player
- **Dark Theme**: Easy on the eyes for long study sessions

## 🚀 Quick Start

### Prerequisites
- **Node.js** installed ([Download here](https://nodejs.org/))
- **YouTube Data API v3 key** (free from Google Cloud Console)

### Installation

1. **Clone or download this repository**
   ```bash
   cd FocusTube
   ```

2. **Start the server**
   ```bash
   node server.js
   ```
   
3. **Open your browser**
   ```
   http://localhost:3000
   ```

4. **Configure API Key** (first-time setup)
   - Click "⚙️ Settings" button
   - Your API key is pre-configured, but you can change it
   - Get your free key from [Google Cloud Console](https://console.cloud.google.com/apis/credentials)

## 📖 How to Use

### Adding Courses

1. Click **"+ Add Course"** button in the top-right
2. (Optional) Enter a course title
3. Paste YouTube URLs in the textarea:
   - **Playlist URL**: `https://www.youtube.com/playlist?list=PLAYLIST_ID`
   - **Single Video**: `https://www.youtube.com/watch?v=VIDEO_ID`
   - **Short URL**: `https://youtu.be/VIDEO_ID`
   - **Multiple URLs**: One per line (mix playlists and videos)
4. Click **"Add to Library"**
5. Videos will be fetched and added to your course library

### Watching Videos

1. **Click any lesson** to start playing
2. Video auto-resumes from your last position
3. Use **Previous/Next** buttons or keyboard arrows to navigate
4. Press **Space** to play/pause
5. Click **✓ Complete** to mark lesson as done
6. Click **⊘ Skip** to mark lesson as skipped
7. Progress saves automatically every second

### Taking Notes

1. While watching, type notes in the textarea below the player
2. Press **"Add Note"** or **Ctrl+Enter** to save
3. Notes automatically include the current video timestamp
4. Click the **⏱️ timestamp** on any note to jump back to that moment
5. Click **×** to delete notes you don't need

### Managing Courses

- **Expand/Collapse**: Click course title to show/hide lessons
- **Delete Course**: Click **×** button next to course title
- **Track Progress**: See completion status (e.g., "5/20 lessons completed")
- **Lesson Status**: ✓ = Completed, ⊘ = Skipped

## ⚙️ YouTube API Setup

To use playlist features, you need a free YouTube Data API v3 key:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Enable **YouTube Data API v3**
4. Go to **Credentials** → **Create Credentials** → **API Key**
5. Copy the API key
6. In FocusTube, click **⚙️ Settings** and paste your key
7. Click **Save Settings**

**Free Tier**: 10,000 requests/day (more than enough for personal use)

## 🛠️ Alternative: Run Without Node.js

Don't want to use Node.js? Use Python's built-in server:

```bash
# Python 3
python -m http.server 3000
```

Or use any local server:
- [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) (VS Code extension)
- [http-server](https://www.npmjs.com/package/http-server) (npm package)

## 🔒 Privacy & Security

- ✅ **No Backend**: Everything runs in your browser
- ✅ **Local Storage**: All data stored locally (courses, progress, notes)
- ✅ **API Key Security**: Stored in browser localStorage (not in source code)
- ✅ **No Tracking**: Zero analytics, no external dependencies
- ✅ **No Data Collection**: Your learning data never leaves your computer
- ✅ **Open Source**: Full transparency - inspect all code

## 📂 Project Structure

```
FocusTube/
├── index.html                    # Main HTML structure
├── style.css                     # App styling and layout
├── hide-youtube-endscreen.css    # CSS to hide YouTube overlays
├── script.js                     # Application logic and features
├── server.js                     # Simple Node.js HTTP server
├── package.json                  # Node.js configuration
└── README.md                     # This file
```

## 🐛 Troubleshooting

### Videos won't play
- ✅ Make sure you're running on a server (not opening HTML file directly)
- ✅ Start server with `node server.js`
- ✅ Check browser console for errors

### Playlists won't load
- ✅ Verify your YouTube API key is configured in Settings
- ✅ Check that the playlist is public (not private/unlisted)
- ✅ Ensure you haven't exceeded API quota (10,000 requests/day)
- ✅ Check browser console for error messages

### Progress not saving
- ✅ Ensure browser allows localStorage
- ✅ Don't use private/incognito mode (data won't persist)
- ✅ Check that you're on localhost (not file://)

### End screens still showing
- ✅ Videos now stop 2 seconds before the end automatically
- ✅ If issues persist, clear browser cache and refresh

### Notes not appearing
- ✅ Make sure you've selected a lesson (video is playing)
- ✅ Check that you clicked "Add Note" or pressed Ctrl+Enter
- ✅ Notes are per-lesson, switch lessons to see different notes

## 🎯 Use Cases

- **Online Courses**: Udemy, Coursera, YouTube tutorials
- **University Lectures**: Recorded lectures and seminars
- **Skill Development**: Programming, design, languages, etc.
- **Professional Training**: Corporate training videos
- **Personal Learning**: Any YouTube educational content

## 💡 Tips & Best Practices

1. **Organize by Topic**: Create separate courses for different subjects
2. **Use Playlists**: Import entire YouTube playlists in one click
3. **Take Notes**: Use timestamped notes to mark important concepts
4. **Mark Progress**: Use Complete/Skip to track your learning journey
5. **Keyboard Shortcuts**: Speed up navigation with arrow keys
6. **Regular Backups**: Export localStorage periodically (browser-dependent)

## 📝 License

MIT License - Free to use, modify, and distribute.

## 🤝 Contributing

This is a complete MVP. Feel free to:
- Fork and customize for your needs
- Report bugs via GitHub issues
- Submit pull requests with improvements
- Share with other learners

## 🎓 Credits

Built for focused learning with:
- YouTube IFrame API
- YouTube Data API v3
- Vanilla JavaScript (no frameworks)
- LocalStorage for data persistence

---

**Made for serious learners who want zero distractions** 📖✨

**Stop watching YouTube. Start learning with FocusTube.** 🎯
