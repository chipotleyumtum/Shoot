<script>
  import { onMount, onDestroy } from 'svelte';
  import { user, rememberLogin, setRememberLogin, touchUserIndex } from './user';

  let username;
  let password;
  let canvas;
  let animationId;

  function login() {
    setRememberLogin($rememberLogin);
    user.auth(username, password, ({ err }) => err && alert(err));
  }

  function signup() {
    setRememberLogin($rememberLogin);
    user.create(username, password, ({ err }) => {
      if (err) {
        alert(err);
      } else {
        touchUserIndex(username, true);
        login();
      }
    });
  }

  onMount(() => {
    const ctx = canvas.getContext('2d');
    
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;
    
    const fontSize = 16;
    const columns = Math.ceil(width / fontSize);
    
    // Array of drops - one per column
    const drops = [];
    for (let x = 0; x < columns; x++) {
      drops[x] = Math.random() * -100; // Start at random heights above screen
    }

    function draw() {
      // Translucent black background to create trail effect
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, width, height);
      
      ctx.fillStyle = '#0F0'; // Matrix green
      ctx.font = fontSize + 'px monospace';
      
      for (let i = 0; i < drops.length; i++) {
        // Random binary character
        const text = Math.floor(Math.random() * 2); 
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);
        
        // Reset drop to top randomly after it has crossed screen
        if (drops[i] * fontSize > height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        
        drops[i]++;
      }
      
      animationId = requestAnimationFrame(draw);
    }
    
    draw();

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      // Re-initialize drops on resize to cover new width
      const newColumns = Math.ceil(width / fontSize);
      if (newColumns > drops.length) {
          for (let i = drops.length; i < newColumns; i++) {
              drops[i] = Math.random() * -100;
          }
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
    };
  });
</script>

<canvas bind:this={canvas} class="matrix-canvas" />

<div class="login-wrapper">
  <div class="login-card">
    <h2 class="glitch-text" data-text="Welcome to Shoot/Dinglechat">Welcome to Shoot/Dinglechat</h2>
    
    <div class="input-group">
      <label for="username">Identity</label>
      <input 
        name="username" 
        bind:value={username} 
        minlength="3" 
        maxlength="16" 
        placeholder="Username"
        autocomplete="username" 
      />
    </div>

    <div class="input-group">
      <label for="password">Passcode</label>
      <input 
        name="password" 
        bind:value={password} 
        type="password" 
        placeholder="Password"
        autocomplete="current-password" 
      />
    </div>

    <label class="remember-row" for="remember-login">
      <input id="remember-login" type="checkbox" bind:checked={$rememberLogin} />
      <span>Keep me logged in</span>
    </label>

    <div class="login-buttons">
      <button class="circle-btn login-btn" on:click={login} aria-label="Login">
        <span>LOGIN</span>
      </button>
      <div class="or-divider">OR</div>
      <button class="circle-btn signup-btn" on:click={signup} aria-label="Sign Up">
        <span>SIGN UP</span>
      </button>
    </div>
  </div>
</div>

<style>
  .matrix-canvas {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 0;
    pointer-events: none;
  }

  .login-wrapper {
    position: relative;
    z-index: 10;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 80vh; /* Changed from 100vh to ensure it fits within main */
    width: 100%;
  }

  .login-card {
    background: rgba(10, 10, 10, 0.85);
    backdrop-filter: blur(12px);
    padding: 3rem 2.5rem;
    border-radius: 20px;
    border: 1px solid rgba(0, 255, 0, 0.2);
    box-shadow: 0 0 20px rgba(0, 255, 0, 0.1);
    width: 100%;
    max-width: 450px;
    text-align: center;
  }

  h2 {
    color: #0F0;
    font-family: monospace;
    font-size: 1.8rem;
    margin-bottom: 2rem;
    text-shadow: 0 0 5px #0F0;
    letter-spacing: 2px;
  }

  .input-group {
    margin-bottom: 1.5rem;
    text-align: left;
  }

  .remember-row {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    justify-content: flex-start;
    color: rgba(150, 255, 170, 0.9);
    font-family: monospace;
    font-size: 0.88rem;
    text-transform: none;
    margin-top: -0.3rem;
    margin-bottom: 0.75rem;
    cursor: pointer;
  }

  .remember-row input {
    width: 1rem;
    height: 1rem;
    margin: 0;
    accent-color: #33ff77;
    border-radius: 4px;
    box-shadow: none;
    padding: 0;
    border: 1px solid rgba(64, 255, 128, 0.6);
    background: rgba(0, 0, 0, 0.6);
  }

  label {
    color: #0F0;
    font-family: monospace;
    font-size: 0.9rem;
    margin-bottom: 0.5rem;
    display: block;
    text-transform: uppercase;
  }

  input {
    width: 100%;
    padding: 1rem 1.25rem;
    font-size: 1.2rem; /* Bigger inputs */
    background: rgba(0, 20, 0, 0.6);
    border: 1px solid #0F0; /* Matrix green border */
    color: #0F0;
    border-radius: 8px;
    font-family: monospace;
    transition: all 0.3s;
  }

  input:focus {
    box-shadow: 0 0 15px rgba(0, 255, 0, 0.4);
    outline: none;
    background: rgba(0, 30, 0, 0.8);
  }
  
  input::placeholder {
    color: rgba(0, 255, 0, 0.3);
  }

  .login-buttons {
    display: flex;
    justify-content: center; /* Center buttons horizontally */
    align-items: center;
    gap: 1.5rem;
    margin-top: 2.5rem;
    width: 100%;
  }

  .circle-btn {
    width: 100px;
    height: 100px;
    border-radius: 50%; /* Perfect circle */
    border: 2px solid #0F0;
    background: rgba(0, 20, 0, 0.8);
    color: #0F0;
    font-weight: bold;
    font-family: monospace;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 0; 
    box-shadow: 0 0 10px rgba(0, 255, 0, 0.2);
    font-size: 1rem;
  }

  .circle-btn span {
    pointer-events: none;
  }

  .circle-btn:hover {
    transform: scale(1.1);
    box-shadow: 0 0 20px rgba(0, 255, 0, 0.6);
    background: rgba(0, 40, 0, 0.9);
    text-shadow: 0 0 8px #0F0;
  }

  .circle-btn:active {
    transform: scale(0.95);
  }

  .login-btn {
    background: rgba(0, 50, 0, 0.4);
  }

  .signup-btn {
    border-style: dashed;
  }

  .or-divider {
    color: rgba(0, 255, 0, 0.5);
    font-family: monospace;
    font-size: 0.9rem;
    font-weight: bold;
  }

  /* Glitch effect for header */
  .glitch-text {
    position: relative;
  }
  
  .glitch-text::before,
  .glitch-text::after {
    content: attr(data-text);
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }
  
  .glitch-text::before {
    left: 2px;
    text-shadow: -1px 0 red;
    clip: rect(44px, 450px, 56px, 0);
    animation: glitch-anim-1 5s infinite linear alternate-reverse;
  }
  
  .glitch-text::after {
    left: -2px;
    text-shadow: -1px 0 blue;
    clip: rect(44px, 450px, 56px, 0);
    animation: glitch-anim-2 5s infinite linear alternate-reverse;
  }
  
  @keyframes glitch-anim-1 {
    0% { clip: rect(30px, 9999px, 10px, 0); }
    5% { clip: rect(80px, 9999px, 90px, 0); }
    10% { clip: rect(10px, 9999px, 100px, 0); }
    100% { clip: rect(0, 0, 0, 0); }
  }
  
  @keyframes glitch-anim-2 {
    0% { clip: rect(60px, 9999px, 5px, 0); }
    5% { clip: rect(10px, 9999px, 80px, 0); }
    10% { clip: rect(90px, 9999px, 20px, 0); }
    100% { clip: rect(0, 0, 0, 0); }
  }
</style>
  
