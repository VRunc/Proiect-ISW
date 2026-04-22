// Variabile pentru starea aplicatiei
var arr_touches = []; // memoreaza atingerile pe ecran pentru telefoane si tablete
var canvas, ctx, canvasWrapper; // elementele HTML principale unde desenam
var down = false; // ne spune daca butonul de click este apasat
var color = '#1a1a2e'; // culoarea de pornire a pensulei
var width = 5; // grosimea de pornire a liniei
var xPos = 0, yPos = 0; // coordonatele curente ale cursorului
var currentTool = 'pencil'; // instrumentul selectat la inceput
var currentZoom = 1; // nivelul de apropiere, 1 inseamna 100%

// [Inference] Lista care memoreaza stadiile desenului. Comportament asteptat pentru a putea folosi Undo.
var undoStack = []; 

// Variabile pentru imaginea care este lipita (Paste) si poate fi mutata
var floatingImage = null; // retine imaginea inainte de a o lipi definitiv
var floatX = 0, floatY = 0; // pozitia imaginii pe ecran
var isDraggingFloat = false; // ne spune daca in acest moment tragem de imagine
var dragOffsetX = 0, dragOffsetY = 0; // distanta de la coltul imaginii pana la cursor
var baseCanvasSnapshot = new Image(); // fotografia fundalului peste care mutam imaginea

// Initializarea aplicatiei cand se incarca pagina
window.onload = function() {
  canvas = document.getElementById('canvas');
  canvasWrapper = document.getElementById('canvasWrapper');
  
  // Cerem browserului sa ne lase sa desenam in format 2D
  ctx = canvas.getContext('2d', { willReadFrequently: true });
  
  // Asteptam putin sa se incarce designul, apoi ajustam marimea
  setTimeout(resizeCanvas, 50);
  // Salvam o varianta alba a ecranului pentru primul Undo
  setTimeout(saveCanvasState, 100);

  // Ascultam miscarile de mouse
  canvas.addEventListener('mousemove', handleMove); 
  canvas.addEventListener('mousedown', handleDown); 
  canvas.addEventListener('mouseup', handleUp);     
  canvas.addEventListener('mouseleave', handleUp);  
  
  // Ascultam atingerile pe ecrane tactile
  canvas.addEventListener("touchstart", handleStart, {passive: false});
  canvas.addEventListener("touchend", handleEnd, false);
  canvas.addEventListener("touchcancel", handleCancel, false);
  canvas.addEventListener("touchmove", handleTouchMove, {passive: false});

  // Ascultam cand se schimba marimea ferestrei si cand dam Paste
  window.addEventListener('resize', debounce(resizeCanvas, 200));
  window.addEventListener('paste', handlePaste);

  // Inchidem meniul ascuns de culori daca dam click in alta parte
  document.addEventListener('click', function(e) {
    var wrapper = document.getElementById('customPickerWrapper');
    if (wrapper && !wrapper.contains(e.target)) {
      document.getElementById('customPickerPanel').classList.remove('visible');
    }
  });

  // Selectam butonul negru ca fiind cel activ la inceput
  document.getElementById('black').classList.add('active');
};

// Salveaza stadiul curent al desenului pentru a putea da Undo
function saveCanvasState() {
  if (undoStack.length >= 20) {
    undoStack.shift(); // stergem cea mai veche salvare daca am atins limita de 20
  }
  undoStack.push(canvas.toDataURL('image/png'));
}

// Intoarce desenul la stadiul anterior
function undoAction() {
  // Fixam imaginea lipita daca inca pluteste
  if (floatingImage) stampFloatingImage();

  if (undoStack.length > 1) {
    undoStack.pop(); 
    var previousState = undoStack[undoStack.length - 1]; 
    
    var img = new Image();
    img.onload = function() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      document.getElementById('statusText').textContent = 'Actiune anulata.';
    };
    img.src = previousState; 
  } else {
    document.getElementById('statusText').textContent = 'Nu mai exista actiuni anterioare.';
  }
}

// Deseneaza imaginea lipita impreuna cu marginile punctate in timp ce o mutam
function drawFloatingState() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(baseCanvasSnapshot, 0, 0);
  
  if (floatingImage) {
    ctx.drawImage(floatingImage, floatX, floatY);
    
    // Desenam marginea de selectie
    ctx.save();
    ctx.setLineDash([6, 6]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#1e90ff';
    ctx.strokeRect(floatX, floatY, floatingImage.width, floatingImage.height);
    
    // Desenam patratelele de la colturi
    ctx.fillStyle = '#1e90ff';
    var ms = 6;
    ctx.fillRect(floatX - ms/2, floatY - ms/2, ms, ms);
    ctx.fillRect(floatX + floatingImage.width - ms/2, floatY - ms/2, ms, ms);
    ctx.fillRect(floatX - ms/2, floatY + floatingImage.height - ms/2, ms, ms);
    ctx.fillRect(floatX + floatingImage.width - ms/2, floatY + floatingImage.height - ms/2, ms, ms);
    ctx.restore();
  }
}

// Fixeaza imaginea lipita direct pe desenul final
function stampFloatingImage() {
  if (!floatingImage) return;
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(baseCanvasSnapshot, 0, 0);
  ctx.drawImage(floatingImage, floatX, floatY);
  
  floatingImage = null; // anulam starea de plutire
  document.getElementById('statusText').textContent = 'Imagine fixata.';
  saveCanvasState(); 
}

// Logica de lipire a imaginilor din clipboard
function handlePaste(e) {
  var items = e.clipboardData || e.originalEvent.clipboardData;
  if (!items) return; 
  
  if (floatingImage) stampFloatingImage();

  var clipboardItems = items.items;
  for (var i = 0; i < clipboardItems.length; i++) {
    if (clipboardItems[i].type.indexOf("image") !== -1) {
      var blob = clipboardItems[i].getAsFile(); 
      var img = new Image();
      
      img.onload = function() {
        // Marim ecranul daca imaginea e mai mare
        let newWidth = Math.max(canvas.width, img.width + 40);
        let newHeight = Math.max(canvas.height, img.height + 40);
        
        if (newWidth > canvas.width || newHeight > canvas.height) {
          let tempCanvas = document.createElement('canvas');
          let tempCtx = tempCanvas.getContext('2d');
          tempCanvas.width = canvas.width;
          tempCanvas.height = canvas.height;
          tempCtx.drawImage(canvas, 0, 0);

          canvas.width = newWidth;
          canvas.height = newHeight;
          
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(tempCanvas, 0, 0);
          
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
        }
        
        floatingImage = img;
        floatX = 20; 
        floatY = 20;
        
        baseCanvasSnapshot.src = canvas.toDataURL('image/png');
        
        baseCanvasSnapshot.onload = function() {
          drawFloatingState(); 
        };

        document.getElementById('statusText').textContent = 'Muta imaginea cu mouse-ul. Da click pe fundal pentru a o fixa.';
        applyZoom(); 
      };
      
      var URLObj = window.URL || window.webkitURL;
      img.src = URLObj.createObjectURL(blob);
      break; 
    }
  }
}

// Reajusteaza corect spatiul de desen la modificarile ecranului
function resizeCanvas() {
  if (!canvas || !canvasWrapper) return;
  
  if (floatingImage) stampFloatingImage();

  let rect = canvasWrapper.getBoundingClientRect();
  let newWidth = Math.max(canvas.width || 0, rect.width);
  let newHeight = Math.max(canvas.height || 0, rect.height);

  if (canvas.width === newWidth && canvas.height === newHeight) {
      applyZoom();
      return;
  }

  let tempCanvas = document.createElement('canvas');
  let tempCtx = tempCanvas.getContext('2d');
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;
  
  if (canvas.width > 0 && canvas.height > 0) {
      tempCtx.drawImage(canvas, 0, 0);
  }

  canvas.width = newWidth;
  canvas.height = newHeight;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  if (tempCanvas.width > 0 && tempCanvas.height > 0) {
      ctx.drawImage(tempCanvas, 0, 0);
  }
  
  applyZoom();
}

// Impiedica rularea repetitiva prea rapida a functiilor
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => { clearTimeout(timeout); func(...args); };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Mareste sau micsoreaza desenul adaugand o valoare
function adjustZoom(factor) {
  currentZoom += factor;
  if (currentZoom < 0.2) currentZoom = 0.2; 
  if (currentZoom > 5) currentZoom = 5;     
  applyZoom();
}

// Readuce desenul la marimea originala
function resetZoom() {
  currentZoom = 1;
  applyZoom();
}

// Aplica vizual modificarea de zoom
function applyZoom() {
  canvas.style.width = (canvas.width * currentZoom) + 'px';
  canvas.style.height = (canvas.height * currentZoom) + 'px';
  if(!floatingImage) document.getElementById('statusText').textContent = `Zoom: ${Math.round(currentZoom * 100)}%`;
}

// Calculeaza corect coordonatele cursorului luand in calcul si nivelul de zoom
function getCanvasPos(e) {
  var rect = canvas.getBoundingClientRect();
  var scaleX = canvas.width / rect.width;
  var scaleY = canvas.height / rect.height;
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY
  };
}

// Evenimente pentru momentul apasarii pe mouse
function handleDown(e) {
  var pos = getCanvasPos(e);
  
  // Verificam daca dam click pe o imagine lipita
  if (floatingImage) {
    if (pos.x >= floatX && pos.x <= floatX + floatingImage.width &&
        pos.y >= floatY && pos.y <= floatY + floatingImage.height) {
        
        isDraggingFloat = true; 
        dragOffsetX = pos.x - floatX;
        dragOffsetY = pos.y - floatY;
        return; 
    } else {
        stampFloatingImage();
    }
  }

  down = true; 
  xPos = pos.x; yPos = pos.y;
  ctx.beginPath(); 
  ctx.moveTo(xPos, yPos);
}

// Evenimente pentru miscarea mouse-ului
function handleMove(e) {
  var pos = getCanvasPos(e);
  
  // Muta imaginea lipita daca tragem de ea
  if (isDraggingFloat && floatingImage) {
    floatX = pos.x - dragOffsetX;
    floatY = pos.y - dragOffsetY;
    drawFloatingState(); 
    return;
  }
  
  // Traseaza linia cand desenam normal
  xPos = pos.x; yPos = pos.y; 
  if (down) {
    ctx.lineTo(xPos, yPos);
    ctx.strokeStyle = currentTool === 'eraser' ? '#ffffff' : color;
    ctx.lineWidth = width;
    ctx.stroke(); 
  }
}

// Evenimente pentru ridicarea butonului mouse-ului
function handleUp() { 
  if (isDraggingFloat) {
    isDraggingFloat = false;
    return;
  }

  if (down) {
    down = false; 
    saveCanvasState(); 
  }
}

// Evenimentele inceperii atingerii ecranului pe telefoane
function handleStart(evt) {
  evt.preventDefault(); 
  
  var touches = evt.changedTouches; 
  var pos = getCanvasPos(touches[0]); 

  if (floatingImage && touches.length === 1) {
    if (pos.x >= floatX && pos.x <= floatX + floatingImage.width &&
        pos.y >= floatY && pos.y <= floatY + floatingImage.height) {
        
        isDraggingFloat = true;
        dragOffsetX = pos.x - floatX;
        dragOffsetY = pos.y - floatY;
        return; 
    } else {
        stampFloatingImage(); 
    }
  }

  var rect = canvas.getBoundingClientRect();
  var scaleX = canvas.width / rect.width;
  var scaleY = canvas.height / rect.height;

  for (var i = 0; i < touches.length; i++) {
    if (isValidTouch(touches[i])) {
      arr_touches.push(copyTouch(touches[i])); 
      ctx.beginPath();
      var startX = (touches[i].clientX - rect.left) * scaleX;
      var startY = (touches[i].clientY - rect.top) * scaleY;
      ctx.moveTo(startX, startY); 
    }
  }
}

// Evenimentele pentru miscarea degetului pe ecrane tactile
function handleTouchMove(evt) {
  evt.preventDefault();
  var touches = evt.changedTouches;

  if (isDraggingFloat && floatingImage) {
     var pos = getCanvasPos(touches[0]);
     floatX = pos.x - dragOffsetX;
     floatY = pos.y - dragOffsetY;
     drawFloatingState();
     return;
  }

  var rect = canvas.getBoundingClientRect();
  var scaleX = canvas.width / rect.width;
  var scaleY = canvas.height / rect.height;
  
  for (var i = 0; i < touches.length; i++) {
    if (isValidTouch(touches[i])) {
      var idx = ongoingTouchIndexById(touches[i].identifier);
      if (idx >= 0) {
        ctx.lineTo((touches[i].clientX - rect.left) * scaleX, (touches[i].clientY - rect.top) * scaleY);
        ctx.strokeStyle = currentTool === 'eraser' ? '#ffffff' : color;
        ctx.lineWidth = width;
        ctx.stroke();
        arr_touches.splice(idx, 1, copyTouch(touches[i]));
      }
    }
  }
}

// Evenimentele pentru terminarea atingerii
function handleEnd(evt) {
  evt.preventDefault();

  if (isDraggingFloat) {
    isDraggingFloat = false;
    return;
  }

  var touches = evt.changedTouches;
  var touchRemoved = false;
  
  for (var i = 0; i < touches.length; i++) {
    if (isValidTouch(touches[i])) {
      var idx = ongoingTouchIndexById(touches[i].identifier);
      if (idx >= 0) {
        arr_touches.splice(idx, 1);
        touchRemoved = true;
      }
    }
  }
  
  if (touchRemoved && arr_touches.length === 0) {
      saveCanvasState();
  }
}

// Stergerea fortata a atingerilor
function handleCancel(evt) {
  evt.preventDefault();
  var touches = evt.changedTouches;
  for (var i = 0; i < touches.length; i++) arr_touches.splice(i, 1);
  saveCanvasState(); 
}

// Copierea datelor elementare ale atingerii
function copyTouch(touch) { 
  return { identifier: touch.identifier, clientX: touch.clientX, clientY: touch.clientY }; 
}

// Cauta in memorie ce deget foloseste utilizatorul
function ongoingTouchIndexById(idToFind) {
  for (var i = 0; i < arr_touches.length; i++) {
    if (arr_touches[i].identifier == idToFind) return i;
  }
  return -1; 
}

// Verifica daca utilizatorul atinge interiorul desenului si nu in afara lui
function isValidTouch(touch) {
  var rect = canvas.getBoundingClientRect();
  return touch.clientX >= rect.left && touch.clientX <= rect.right &&
         touch.clientY >= rect.top  && touch.clientY <= rect.bottom;
}

// Ascunde sau arata meniul pentru culori
function toggleCustomPicker() {
  document.getElementById('customPickerPanel').classList.toggle('visible');
}

// Aplica o culoare dupa codul introdus in casuta text
function applyHexInput() {
  var inputVal = document.getElementById('hexInput').value.trim();
  
  if (inputVal.charAt(0) !== '#') inputVal = '#' + inputVal;
  //verificam daca e un cod hex valid (3 sau 6 cifre)
  if (/^#([0-9A-F]{3}){1,2}$/i.test(inputVal)) {
    changeColor(inputVal); 
    document.getElementById('customPickerPanel').classList.remove('visible'); 
  } else {
    document.getElementById('statusText').textContent = 'Cod Hex invalid.';
  }
}

// Sincronizeaza interfata cand utilizatorul alege o culoare din noul selector browser
function handleNativeColor(hexValue) {
  document.getElementById('hexInput').value = hexValue.substring(1); 
  changeColor(hexValue); 
}

// Actualizeaza creionul cu culoarea aleasa si lumineaza butonul potrivit
function changeColor(new_color) {
  color = new_color; 
  
  currentTool = 'pencil';
  document.getElementById('pencilBtn').classList.add('active');
  document.getElementById('eraserBtn').classList.remove('active');
  
  document.getElementById('currentSwatch').style.background = new_color;
  document.getElementById('currentColorLabel').textContent = new_color;
  
  document.querySelectorAll('#colors > button, #customColorBtn').forEach(b => b.classList.remove('active'));
  
  let found = false;
  document.querySelectorAll('#colors > button').forEach(b => {
    if(b.id === 'customColorBtn') return; 
    
    var bg = window.getComputedStyle(b).backgroundColor;
    var hex = rgbToHex(bg);
    
    if (hex.toLowerCase() === new_color.toLowerCase()) {
      b.classList.add('active');
      found = true;
    }
  });

  if(!found) {
    document.getElementById('customColorBtn').classList.add('active');
    document.getElementById('customColorBtn').style.background = new_color;
  }

  var nativeInput = document.getElementById('nativeColorInput');
  if (nativeInput && new_color.length === 7) {
      nativeInput.value = new_color.toLowerCase();
  }
  
  var hexInputText = document.getElementById('hexInput');
  if (hexInputText) {
      hexInputText.value = new_color.replace('#', '');
  }
}

// Converteste coduri RGB in format hexazecimal scurt
function rgbToHex(rgb) {
  var result = rgb.match(/\d+/g);
  if (!result) return rgb; 
  return '#' + result.slice(0,3).map(x => parseInt(x).toString(16).padStart(2,'0')).join('');
}

// Modifica cat de groasa deseneaza pensula
function changeSize(val) {
  width = parseInt(val);
  ctx.lineWidth = width; 
  
  var dot = document.getElementById('sizeDot');
  var s = Math.min(val, 30); 
  dot.style.width = s + 'px';
  dot.style.height = s + 'px';

  var displayValue = document.getElementById('sizeValueDisplay');
  if (displayValue) {
    displayValue.textContent = val + 'px';
  } else {
    // [Unverified] Notificam doar ca avertizare in consola, nu influenteaza fluiditatea aplicatiei
    console.warn('Elementul sizeValueDisplay lipseste.');
  }
}

// Activeaza intre creion si guma
function setTool(tool) {
  currentTool = tool;
  document.getElementById('pencilBtn').classList.toggle('active', tool === 'pencil');
  document.getElementById('eraserBtn').classList.toggle('active', tool === 'eraser');
}

// Sterge tot si pune culoarea alba pe fundal
function clearCanvas() {
  if (floatingImage) floatingImage = null; 
  
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  document.getElementById('statusText').textContent = 'Canvas sters.';
  saveCanvasState();
}

// Descarca imaginea in calculatorul utilizatorului
function saveCanvas() {
  if (floatingImage) stampFloatingImage(); 

  var link = document.createElement('a'); 
  link.download = 'desen.png'; 
  link.href = canvas.toDataURL('image/png'); 
  link.click(); 
  document.getElementById('statusText').textContent = 'Salvat.';
}