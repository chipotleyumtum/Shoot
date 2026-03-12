<script>
  import { username, user, userAvatar } from './user';

  function signout() {
    user.leave();
    username.set('');
    userAvatar.set('');
  }

  function uploadAvatar(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    // limit size to ~100KB for GUN storage performance
    if (file.size > 100 * 1024) {
      alert('Image too large. Please use an image under 100KB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      user.get('avatar').put(event.target.result);
    };
    reader.readAsDataURL(file);
  }

  const fallbackAvatar = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23ccc'/%3E%3Cpath d='M50 50 L50 20' stroke='bg' stroke-width='2'/%3E%3Ccircle cx='50' cy='35' r='20' fill='%23666'/%3E%3Cpath d='M10 100 A 40 40 0 0 1 90 100' fill='%23666'/%3E%3C/svg%3E";
  
  function handleAvatarError(e) {
    e.target.src = fallbackAvatar;
  }
</script>

<header class:guest-mode={!$username}>
  <div class="brand">
    <h1>Shoot!</h1>
    <span class="tagline">Fast talk. Clean shots.</span>
  </div>

  {#if $username}
    <div class="user-bio">
      <span>Hello <strong>{$username}</strong></span>
      
      <label for="avatar-upload" class="avatar-label" title="Click to change avatar">
        <img 
          src={$userAvatar || `https://avatars.dicebear.com/api/initials/${$username}.svg`} 
          on:error={handleAvatarError} 
          alt={`Avatar for ${$username}`} 
        />
        <div class="edit-overlay">✎</div>
      </label>
      <input type="file" id="avatar-upload" accept="image/*" on:change={uploadAvatar} style="display: none;" />
    </div>

    <button class="signout-button" on:click={signout}>Sign Out</button>
  {:else}
    <!-- Guest label removed -->
  {/if}
</header>
