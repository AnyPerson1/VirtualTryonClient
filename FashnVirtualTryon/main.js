function settingsPopup() { 
  const popup = document.getElementById("settings-container");
  if (popup) {
    popup.classList.toggle("active");
  } else {
    console.error("Element with ID 'settings-container' not found.");
  }
}