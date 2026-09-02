(function(){
  var book = document.getElementById('book');
  var cover = document.getElementById('cover');
  var topHint = document.getElementById('topHint');
  var backBtn = document.getElementById('backBtn');
  var pageLeft = document.getElementById('pageLeft');
  var peekHint = document.getElementById('peekHint');
  var pageRight = document.getElementById('pageRight');

  var opened = false;

  function openBook(){
    if(opened) return;
    opened = true;
    book.classList.add('open');
    topHint.style.opacity = '0';
    setTimeout(function(){ topHint.textContent = ''; }, 450);
    initAudioOnce();
  }

  function closeBook(){
    if(!opened) return;
    opened = false;
    book.classList.remove('open');
    topHint.textContent = 'tap the photo to open';
    requestAnimationFrame(function(){ topHint.style.opacity = '1'; });
    pageLeft.classList.remove('lifted');
  }

  cover.addEventListener('click', openBook);
  backBtn.addEventListener('click', closeBook);

  // ---- letter lift / tuck ----
  pageLeft.addEventListener('click', function(e){
    if(!opened) return;
    pageLeft.classList.toggle('lifted');
  });

  // ================= CANDLES / MIC BLOWING =================
  var flames = [
    document.getElementById('flame-c1'),
    document.getElementById('flame-c2'),
    document.getElementById('flame-c3')
  ];
  var micStatus = document.getElementById('micStatus');
  var micFill = document.getElementById('micFill');
  var blowBtn = document.getElementById('blowBtn');
  var wishOverlay = document.getElementById('wishOverlay');
  var relightBtn = document.getElementById('relightBtn');
  var confettiLayer = document.getElementById('confettiLayer');

  var lit = true;
  var blowLevel = 0;
  var blowAccumMs = 0;
  var BLOW_THRESHOLD = 0.16;
  var BLOW_HOLD_MS = 500;
  var manualBlowing = false;
  var audioCtx, analyser, dataArray, micReady = false, rafId = null;
  var lastT = null;

  function initAudioOnce(){
    if(audioCtx) return;
    if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
      micStatus.textContent = 'hold the button or press space to blow';
      startLoop();
      return;
    }
    navigator.mediaDevices.getUserMedia({audio:true}).then(function(stream){
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      var source = audioCtx.createMediaStreamSource(stream);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.6;
      dataArray = new Uint8Array(analyser.fftSize);
      source.connect(analyser);
      micReady = true;
      micStatus.textContent = 'listening for your breath…';
      startLoop();
    }).catch(function(err){
      micStatus.textContent = 'hold the button or press space to blow';
      startLoop();
    });
  }

  function getMicVolume(){
    if(!micReady) return 0;
    analyser.getByteTimeDomainData(dataArray);
    var sum = 0;
    for(var i=0;i<dataArray.length;i++){
      var v = (dataArray[i]-128)/128;
      sum += v*v;
    }
    var rms = Math.sqrt(sum/dataArray.length);
    return rms;
  }

  function startLoop(){
    if(rafId) return;
    lastT = performance.now();
    rafId = requestAnimationFrame(loop);
  }

  function loop(t){
    rafId = requestAnimationFrame(loop);
    var dt = t - lastT;
    lastT = t;

    var rawVol = manualBlowing ? 0.9 : getMicVolume();
    var target = Math.min(1, rawVol * 4.2);
    blowLevel += (target - blowLevel) * 0.35;

    micFill.style.width = (Math.min(1, blowLevel) * 100).toFixed(1) + '%';

    if(lit){
      if(blowLevel > BLOW_THRESHOLD){
        blowAccumMs += dt;
      } else {
        blowAccumMs = Math.max(0, blowAccumMs - dt*1.5);
      }

      var bendDeg = Math.min(34, blowLevel * 46);
      var flicker = Math.sin(t/70) * blowLevel * 4;
      flames.forEach(function(f, idx){
        var sway = Math.sin(t/260 + idx) * 2.5;
        f.style.transform = 'rotate(' + (bendDeg + flicker + sway) + 'deg) scaleY(' + (1 - blowLevel*0.12) + ')';
      });

      if(blowAccumMs >= BLOW_HOLD_MS){
        extinguishAll();
      }
    }
  }

  function extinguishAll(){
    lit = false;
    flames.forEach(function(f){ f.classList.add('out'); });
    micStatus.textContent = 'candles out';
    setTimeout(function(){
      pageRight.classList.add('blown');
      burstConfetti();
    }, 480);
  }

  function relight(){
    lit = true;
    blowAccumMs = 0;
    blowLevel = 0;
    flames.forEach(function(f){
      f.classList.remove('out');
      f.style.transform = 'rotate(0deg) scale(1)';
    });
    pageRight.classList.remove('blown');
    confettiLayer.innerHTML = '';
    micStatus.textContent = 'listening for your breath…';
  }

  relightBtn.addEventListener('click', relight);

  function burstConfetti(){
    confettiLayer.innerHTML = '';
    var n = 46;
    var pieces = [];
    for(var i=0;i<n;i++){
      var p = document.createElement('div');
      p.className = 'confetti-piece';
      var left = Math.random()*100;
      p.style.left = left + '%';
      p.style.background = (Math.random() > 0.5) ? '#0a0a0a' : '#1c1c1c';
      confettiLayer.appendChild(p);
      pieces.push({
        el: p,
        delay: Math.random()*500,
        dur: 1600 + Math.random()*1400,
        drift: Math.random()*60-30,
        spin: Math.random()*520-260,
        started: null
      });
    }
    var t0 = performance.now();
    var fallDistance = confettiLayer.clientHeight * 1.15 || 500;
    function step(now){
      var elapsed = now - t0;
      var stillGoing = false;
      pieces.forEach(function(pc){
        var pt = elapsed - pc.delay;
        if(pt < 0){ stillGoing = true; return; }
        var progress = pt / pc.dur;
        if(progress >= 1){
          pc.el.style.opacity = '0';
          return;
        }
        stillGoing = true;
        var y = progress * fallDistance;
        var x = pc.drift * progress;
        var rot = pc.spin * progress;
        var op = progress < 0.85 ? 0.95 : (0.95 * (1 - (progress-0.85)/0.15));
        pc.el.style.transform = 'translateY(' + y + 'px) translateX(' + x + 'px) rotate(' + rot + 'deg)';
        pc.el.style.opacity = String(op);
      });
      if(stillGoing){
        requestAnimationFrame(step);
      }
    }
    requestAnimationFrame(step);
  }

  // ---- fallback: hold-to-blow button ----
  function setManual(on){
    manualBlowing = on;
    blowBtn.textContent = on ? 'blowing…' : 'hold to blow';
  }

  ['mousedown','touchstart'].forEach(function(ev){
    blowBtn.addEventListener(ev, function(e){ e.preventDefault(); setManual(true); }, {passive:false});
  });

  ['mouseup','mouseleave','touchend','touchcancel'].forEach(function(ev){
    blowBtn.addEventListener(ev, function(e){ setManual(false); });
  });

  // ---- fallback: spacebar ----
  window.addEventListener('keydown', function(e){
    if(e.code === 'Space'){
      e.preventDefault();
      setManual(true);
    }
  });

  window.addEventListener('keyup', function(e){
    if(e.code === 'Space'){
      e.preventDefault();
      setManual(false);
    }
  });

})();
