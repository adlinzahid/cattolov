import { useState, useEffect } from 'react'
import './App.css'

// Main App component - handles the cat swiping logic and different screens
function App() {
  // ===== STATE MANAGEMENT =====
  // All the data the app needs to remember between renders
  
  // cats: Array of cat objects [{id, url}] fetched from API cataas
  const [cats, setCats] = useState([])
  
  // currentIndex: Which cat is currently showing (0 = first cat, 1 = second etc)
  const [currentIndex, setCurrentIndex] = useState(0)
  
  // likedCats: Array of cat objects that the user liked (swiped right)
  const [likedCats, setLikedCats] = useState([])
  
  // isFinished: Boolean flag - true when user has gone through all cats (in this case 10 cats)
  const [isFinished, setIsFinished] = useState(false)
  
  // isLoading: Boolean flag - true while app is fetching cat images from API cataas
  const [isLoading, setIsLoading] = useState(true)
  
  // showWelcome: Boolean flag - controls welcome modal visibility for first-time users
  const [showWelcome, setShowWelcome] = useState(true)

  // SIDE EFFECT: Load cat images when component mounts or resets after finishing
  // useEffect runs after component renders. Dependencies array [isFinished] means
  // this effect runs when the component first mounts AND whenever isFinished changes
  useEffect(() => {
    // Async function to fetch cat images from the API
    const loadCats = async () => {
      setIsLoading(true)
      
      // Memory management: Clean up old blob URLs to prevent memory leaks
      // Blob URLs are temporary URLs created for cached images
      if (cats.length > 0) {
        cats.forEach(cat => {
          if (cat.url.startsWith('blob:')) {
            URL.revokeObjectURL(cat.url) // Free up memory by deleting old blob URLs
          }
        })
      }
      
      // Fetch 10 cat images from cataas.com API in parallel
      // Array.from({length: 10}) creates array [undefined, undefined, ...] with 10 items
      // We map over it to create 10 fetch promises
      const catPromises = Array.from({ length: 10 }, async (_, i) => {
        try {
          // Fetch each cat image with cache-busting query params (Date.now() + random)
          // This ensures cattolov gets fresh and different cats each time user starts over
          const response = await fetch(`https://cataas.com/cat?nocache=${Date.now()}-${Math.random()}`)
          
          // Convert response to blob (binary large object - raw image data)
          const blob = await response.blob()
          
          // Create a local URL for the blob so we can display it
          // This caches the image in browser memory for faster display
          const blobUrl = URL.createObjectURL(blob)
          
          return {
            id: i,
            url: blobUrl
          }
        } catch (error) {
          // If fetch fails, log error and use direct API URL as fallback
          console.error('Failed to load cat:', error)
          return {
            id: i,
            url: `https://cataas.com/cat?${Date.now()}-${i}` // Fallback with timestamp
          }
        }
      })
      
      // Wait for all 10 cat images to load
      // Promise.all waits for all promises to resolve and returns array of results
      const loadedCats = await Promise.all(catPromises)
      setCats(loadedCats)
      setIsLoading(false)
    }

    loadCats()

    // Cleanup function: runs when component unmounts or before effect re-runs
    // Important for preventing memory leaks from blob URLs
    return () => {
      cats.forEach(cat => {
        if (cat.url.startsWith('blob:')) {
          URL.revokeObjectURL(cat.url)
        }
      })
    }
  }, [isFinished]) // Dependency array: re-run this effect when isFinished changes

  // ===== EVENT HANDLER: Process user's swipe decision =====
  // This function is called when user swipes left (dislike) or right (like)
  // Parameter 'liked' is a boolean: true = like, false = dislike
  const handleSwipe = (liked) => {
    if (liked) {
      // If user liked this cat, add it to the likedCats array
      // Spread operator [...likedCats] creates a new array with all existing liked cats
      // Then we add the current cat to the end
      setLikedCats([...likedCats, cats[currentIndex]])
    }
    
    // Move to the next cat in the array
    const nextIndex = currentIndex + 1
    
    // Check if we've reached the end of the cats array
    if (nextIndex >= cats.length) {
      // No more cats to show, switch to summary screen
      setIsFinished(true)
    } else {
      // Still have cats left, update index to show next cat
      setCurrentIndex(nextIndex)
    }
  }

  // ===== EVENT HANDLER: Reset the app to start over =====
  // Called when user clicks "Start Over" button on summary screen
  const handleReset = () => {
    setCurrentIndex(0)        // Go back to first cat
    setLikedCats([])          // Clear all liked cats
    setIsFinished(false)      // Exit summary screen
    setIsLoading(true)        // Show loading state (triggers useEffect to fetch new cats)
  }

  // ===== CONDITIONAL RENDER: Summary Screen =====
  // When user has gone through all cats, show this screen instead of main UI
  if (isFinished) {
    return (
      <div className="summary-screen">
        {/* Show different heading based on whether user liked any cats */}
        <h1>
          {likedCats.length > 0 
            ? "These purrfect cats stole your heart!" // if user at least like one cat and vice versa
            : "No cats stole your heart this time!"} 
        </h1>
        <p className="summary-text">
          {/* Display count of liked cats vs total cats */}
          You liked <strong>{likedCats.length}</strong> out of <strong>{cats.length}</strong> cats
        </p>
        
        {/* Conditional rendering: Show different content based on whether user liked any cats */}
        {likedCats.length > 0 ? (
          // If user liked at least one cat, display them in a grid
          <div className="liked-cats-grid">
            {/* Map over likedCats array to create a card for each liked cat */}
            {/* key={cat.id} helps React efficiently update/re-render the list */}
            {likedCats.map((cat) => (
              <div key={cat.id} className="liked-cat-card">
                <img src={cat.url} alt={`Cat ${cat.id}`} />
              </div>
            ))}
          </div>
        ) : (
          // If user didn't like any cats, show sad message
          <p className="no-likes">You didn't like any cats :c</p>
        )}
        
        {/* Button to reset app and start over with new cats */}
        <button onClick={handleReset} className="reset-button">
          Start Over
        </button>
      </div>
    )
  }

  // ===== CONDITIONAL RENDER: Loading State =====
  // Show loading message while cats are being fetched
  // cats.length === 0 means we haven't loaded any cats yet
  if (cats.length === 0) {
    return <div className="loading">Loading cats... meow</div>
  }

  // Get the current cat object we're displaying
  const currentCat = cats[currentIndex]

  // ===== MAIN APP RENDER =====
  // This is what shows when app is ready and user is swiping through cats
  return (
    <div className="app">
      {/* Header section with title and progress bar */}
      <header className="app-header">
        <h1>CattoLov</h1>
        
        {/* Progress bar container */}
        <div className="progress-container">
          {/* Progress bar that fills based on how many cats user has seen */}
          {/* Inline style: calculate width as percentage (current position / total cats * 100) */}
          <div 
            className="progress-bar" 
            style={{ width: `${((currentIndex + 1) / cats.length) * 100}%` }}
          >
            {/* Display current cat number inside progress bar */}
            <span className="progress-text">{currentIndex + 1}</span>
          </div>
        </div>
      </header>

      {/* Container for the cat card */}
      <div className="card-container">
        {/* CatCard component - handles swipe gestures and animations */}
        {/* Pass current cat data and swipe handler as props */}
        <CatCard 
          cat={currentCat} 
          onSwipe={handleSwipe}
        />
      </div>

      {/* Button container for like/dislike buttons */}
      <div className="button-container">
        {/* Dislike button - calls handleSwipe with false */}
        <button 
          onClick={() => handleSwipe(false)} 
          className="dislike-button"
          aria-label="Dislike" // Accessibility label for screen readers
        >
          ❌
        </button>
        
        {/* Like button - calls handleSwipe with true */}
        <button 
          onClick={() => handleSwipe(true)} 
          className="like-button"
          aria-label="Like" // Accessibility label for screen readers
        >
          ❤️
        </button>
      </div>

      {/* ===== WELCOME MODAL ===== */}
      {/* Conditional rendering: only show modal if showWelcome is true */}
      {showWelcome && (
        // Overlay div - clicking it closes the modal
        <div className="modal-overlay" onClick={() => setShowWelcome(false)}>
          {/* Modal content - clicking here does NOT close modal (stopPropagation prevents bubbling) */}
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Meow! Welcome to CattoLov</h2>
            <p className="modal-main-text">Where you will find purrfect cattos for you!</p>
            
            {/* Instructions section */}
            <div className="modal-instructions">
              <h3>How to Use:</h3>
              <p>👉 Swipe <strong>right</strong> for cats you like</p>
              <p>👈 Swipe <strong>left</strong> for cats you dislike</p>
            </div>
            
            {/* Button to close modal */}
            <button onClick={() => setShowWelcome(false)} className="modal-button">
              Let's Go! Meow
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// =====================================================
// CatCard Component - Handles swipe gestures and card animations
// =====================================================
// This component displays a single cat image and detects swipe gestures
// Props: cat (object with id and url), onSwipe (callback function)
function CatCard({ cat, onSwipe }) {
  // ===== STATE MANAGEMENT FOR SWIPE GESTURE =====
  
  // touchStart: X coordinate where touch/click started (null if not touching)
  const [touchStart, setTouchStart] = useState(null)
  
  // touchEnd: X coordinate where touch/click is currently at (null if not touching)
  const [touchEnd, setTouchEnd] = useState(null)
  
  // dragOffset: Object {x, y} representing how far card has been dragged from center
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  
  // isDragging: Boolean flag - true while user is actively dragging the card
  const [isDragging, setIsDragging] = useState(false)

  // Minimum distance (in pixels) user must swipe to trigger like/dislike
  const minSwipeDistance = 50

  // ===== TOUCH EVENT HANDLERS (for mobile devices) =====
  
  // Called when user first touches the card
  const onTouchStart = (e) => {
    setTouchEnd(null) // Reset end position
    setTouchStart(e.targetTouches[0].clientX) // Save starting X coordinate
    setIsDragging(true) // Mark that drag has started
  }

  // Called continuously as user drags finger across screen
  const onTouchMove = (e) => {
    const currentTouch = e.targetTouches[0].clientX // Get current X position
    const diff = currentTouch - touchStart // Calculate how far we've moved from start
    setDragOffset({ x: diff, y: 0 }) // Update drag offset to animate card
    setTouchEnd(currentTouch) // Update end position
  }

  // Called when user lifts finger from screen
  const onTouchEnd = () => {
    // If we don't have both start and end positions, just reset and exit
    if (!touchStart || !touchEnd) {
      setIsDragging(false)
      setDragOffset({ x: 0, y: 0 })
      return
    }
    
    // Calculate swipe distance (positive = left swipe, negative = right swipe)
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance    // Swiped left (dislike)
    const isRightSwipe = distance < -minSwipeDistance  // Swiped right (like)
    
    // Trigger appropriate action based on swipe direction
    if (isLeftSwipe) {
      onSwipe(false) // Dislike
    } else if (isRightSwipe) {
      onSwipe(true) // Like
    }
    
    // Reset drag state
    setIsDragging(false)
    setDragOffset({ x: 0, y: 0 })
  }

  // ===== MOUSE EVENT HANDLERS (for desktop) =====
  // Same logic as touch handlers but for mouse input
  
  // Called when user clicks down on the card
  const onMouseDown = (e) => {
    setTouchStart(e.clientX) // Save starting X coordinate
    setIsDragging(true)
  }

  // Called as user moves mouse while holding button down
  const onMouseMove = (e) => {
    if (!isDragging) return // Only track movement if we're dragging
    const diff = e.clientX - touchStart // Calculate drag distance
    setDragOffset({ x: diff, y: 0 }) // Update offset for animation
    setTouchEnd(e.clientX) // Update end position
  }

  // Called when user releases mouse button OR mouse leaves card area
  const onMouseUp = () => {
    if (!isDragging) return // Only process if we were dragging
    
    // Check if we have valid drag data
    if (touchStart && touchEnd) {
      const distance = touchStart - touchEnd
      const isLeftSwipe = distance > minSwipeDistance
      const isRightSwipe = distance < -minSwipeDistance
      
      // Trigger swipe action if distance threshold was met
      if (isLeftSwipe) {
        onSwipe(false) // Dislike
      } else if (isRightSwipe) {
        onSwipe(true) // Like
      }
    }
    
    // Reset drag state
    setIsDragging(false)
    setDragOffset({ x: 0, y: 0 })
  }

  // ===== ANIMATION CALCULATIONS =====
  // Calculate rotation angle based on horizontal drag
  // Multiply by 0.1 to make rotation subtle (10% of drag distance)
  const rotation = dragOffset.x * 0.1
  
  // Calculate opacity: fade out as card moves away from center
  // Card becomes more transparent the further it's dragged
  const opacity = 1 - Math.abs(dragOffset.x) / 300

  return (
    <div
      className="cat-card"
      // ===== INLINE STYLES FOR ANIMATION =====
      // Apply dynamic transformations and opacity based on drag state
      style={{
        // Transform: move card horizontally and rotate based on drag
        // translateX moves card left/right, rotate tilts it like a real card being thrown
        transform: `translateX(${dragOffset.x}px) rotate(${rotation}deg)`,
        
        // Opacity makes card fade as it moves away
        opacity: opacity,
        
        // Transition: smooth animation when NOT dragging (returning to center)
        // When dragging, transitions are disabled for immediate response
        transition: isDragging ? 'none' : 'transform 0.3s ease, opacity 0.3s ease',
        
        // Cursor changes to show card is grabbable/being grabbed
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
      // ===== EVENT HANDLERS =====
      // Attach all touch and mouse event handlers to the card
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp} // Treat mouse leaving card same as mouse up
    >
      {/* Cat image */}
      <img 
        src={cat.url} 
        alt="Cat" 
        className="cat-image"
        draggable="false" // Prevent default browser image drag behavior
      />
      
      {/* ===== SWIPE HINT OVERLAYS ===== */}
      {/* Show "LIKE" overlay when dragging right */}
      {/* Conditional rendering: only show when dragging AND moved right by at least 20px */}
      {isDragging && dragOffset.x > 20 && (
        <div className="swipe-overlay like-overlay">❤️ LIKE</div>
      )}
      
      {/* Show "NOPE" overlay when dragging left */}
      {/* Only show when dragging AND moved left by at least 20px */}
      {isDragging && dragOffset.x < -20 && (
        <div className="swipe-overlay dislike-overlay">❌ NOPE</div>
      )}
    </div>
  )
}

// Export App component as default export so it can be imported in other files
export default App
