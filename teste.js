function ruleazaToateTestele() {
    console.log("%c  START: Teste Functii Paint", "background: #1a1a22; color: #ff6b6b; font-size: 14px; font-weight: bold; padding: 6px; border-radius: 4px;");

    let testeTrecute = 0;
    let testePicate = 0;

    function assert(numeTest, conditie) {
        if (conditie) {
            console.log(` [TRECUT] ${numeTest}`);
            testeTrecute++;
        } else {
            console.error(` [PICAT] ${numeTest}`);
            testePicate++;
        }
    }

    try {
        // TESTARE STARE INIȚIALĂ
        assert("Stare Inițială: Culoarea pornește setată pe negru (#1a1a2e)", color === '#1a1a2e');
        assert("Stare Inițială: Grosimea pensulei este 5px", width === 5);
        assert("Stare Inițială: Unealta selectată este creionul", currentTool === 'pencil');
        assert("Stare Inițială: Nivelul de Zoom este 1 (100%)", currentZoom === 1);

        // TESTARE UNELTE (CREION ȘI RADIERĂ)
        setTool('eraser');
        assert("Unelte (Radieră): Variabila și UI-ul trec corect pe Radieră", 
            currentTool === 'eraser' && document.getElementById('eraserBtn').classList.contains('active'));
        
        setTool('pencil');
        assert("Unelte (Creion): Variabila și UI-ul revin corect pe Creion", 
            currentTool === 'pencil' && document.getElementById('pencilBtn').classList.contains('active'));

        // TESTARE GESTIONARE CULORI
        changeColor('#2ed573');
        assert("Culori (Predefinite): Funcția 'changeColor' actualizează culoarea globală și UI-ul", 
            color === '#2ed573' && document.getElementById('currentColorLabel').textContent === '#2ed573');

        handleNativeColor('#ff6b9d');
        assert("Culori (Native Picker): Funcția 'handleNativeColor' procesează corect input-ul", 
            color === '#ff6b9d' && document.getElementById('hexInput').value === 'ff6b9d');

        document.getElementById('hexInput').value = '5352ed';
        applyHexInput();
        assert("Culori (Hex Input): Funcția 'applyHexInput' formatează corect codul adăugând '#' automat", 
            color === '#5352ed');

        // TESTARE GROSIME PENSULĂ (BRUSH SIZE)
        changeSize(24);
        assert("Grosime Pensulă: 'changeSize' setează lățimea contextului 2D la 24px", 
            width === 24 && ctx.lineWidth === 24);

        // TESTARE ZOOM IN/OUT ȘI RESET
        currentZoom = 1;
        adjustZoom(0.2);
        assert("Zoom (Incrementare): 'adjustZoom(0.2)' crește nivelul corect", currentZoom > 1);

        for(let i = 0; i < 50; i++) adjustZoom(0.5);
        assert("Zoom (Limita Maximă): Sistemul blochează depășirea limitei de 500% (x5)", currentZoom === 5);

        for(let i = 0; i < 50; i++) adjustZoom(-0.5);
        assert("Zoom (Limita Minimă): Sistemul blochează micșorarea sub 20% (x0.2)", currentZoom === 0.2);

        resetZoom();
        assert("Zoom (Reset): 'resetZoom' aduce corect ecranul la nivelul inițial (1)", currentZoom === 1);

        // TESTARE UNDO ȘI GESTIONARE MEMORIE
        let istoricInitial = undoStack.length;
        saveCanvasState(); 
        assert("Undo (Salvare): 'saveCanvasState' adaugă corect o stare nouă în memorie", 
            undoStack.length === istoricInitial + 1);

        for(let i = 0; i < 25; i++) saveCanvasState();
        assert("Undo (Gestionare Memorie): Sistemul șterge automat stările vechi pentru a nu depăși limita de 20 (previne memory leaks)", 
            undoStack.length <= 20);

        undoAction();
        assert("Undo (Execuție): 'undoAction' extrage ultima stare din memorie", 
            undoStack.length === 19); 

        // TESTARE CURĂȚARE ECRAN (CLEAR CANVAS)
        clearCanvas();
        assert("Canvas (Ștergere): 'clearCanvas' umple ecranul cu alb și actualizează statusul", 
            document.getElementById('statusText').textContent === 'Canvas sters.');

    } catch (eroare) {
        console.error(" EROARE CRITICĂ: Unul dintre teste a generat o excepție neașteptată:", eroare);
    }
    
    let procentaj = Math.round((testeTrecute / (testeTrecute + testePicate)) * 100);
    let culoareRezultat = procentaj === 100 ? "color: #2ed573;" : "color: #ff4757;";
    
    console.log(`%c  REZULTAT FINAL: ${testeTrecute}/${testeTrecute + testePicate} teste trecute. Procent: ${procentaj}%`, `background: #2e2e3e; ${culoareRezultat} font-weight: bold; padding: 6px; border-radius: 4px;`);

    setTool('pencil');
    changeColor('#1a1a2e');
    changeSize(5);
    resetZoom();
    document.getElementById('statusText').textContent = "Teste finalizate. Gata de desenat!";
}
setTimeout(ruleazaToateTestele, 1000);