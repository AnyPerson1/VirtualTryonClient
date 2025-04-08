
function settingsPopup() {
  const popup = document.getElementById("settings-container");
  if (popup) {
    popup.classList.toggle("active");
  } else {
    console.error("Element with ID 'settings-container' not found.");
  }
}

function closePopup() {
  const popup = document.getElementById("settings-container");
  if (popup) {
    popup.classList.remove("active");
  } else {
    console.error("Element with ID 'settings-container' not found.");
  }
}


function navigate(pageId) {

  const allSections = document.querySelectorAll('.page-section');
  allSections.forEach(section => {
    section.classList.remove('active');
  });


  const allNavLinks = document.querySelectorAll('.navigationItem');
  allNavLinks.forEach(link => {
    link.classList.remove('active');
  });


  const targetSection = document.getElementById(pageId + '-section');
  if (targetSection) {
    targetSection.classList.add('active');
  } else {
    console.error("Hedef bölüm bulunamadı: " + pageId + "-section");
   
    document.getElementById('anasayfa-section').classList.add('active');
    document.getElementById('nav-anasayfa').classList.add('active');
    return; 
  }

 
  const targetNavLink = document.getElementById('nav-' + pageId);
   if (targetNavLink) {
       targetNavLink.classList.add('active');
   } else {
       console.error("Hedef navigasyon linki bulunamadı: nav-" + pageId);
   }

   
   const headerTitle = document.getElementById('header-title');
   if (headerTitle) {
       
       headerTitle.textContent = pageId.charAt(0).toUpperCase() + pageId.slice(1);
       
       if (pageId === 'anasayfa') {
           headerTitle.textContent = 'Anasayfa';
       }
   }
}


document.addEventListener('DOMContentLoaded', () => {

});
    