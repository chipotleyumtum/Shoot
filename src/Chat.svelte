<script>
  import Login from './Login.svelte';
  import ChatMessage from './ChatMessage.svelte';
  import AdminPanel from './AdminPanel.svelte';
  import { onMount } from 'svelte';
  import { username, user } from './user';
  import debounce from 'lodash.debounce';
  import { prepareAndUploadMedia } from './mediaUpload';

  import GUN from 'gun';
  const SEA = GUN.SEA; // Ensure access to SEA via GUN namespace
  const db = GUN();
  const ENCRYPTION_KEY = '#foo';

  let newMessage;
  let messages = [];

  let scrollBottom;
  let lastScrollTop;
  let canAutoScroll = true;
  let unreadMessages = false;
  let isShooting = false;
  let uploadInProgress = false;
  let uploadStatus = '';
  let uploadError = '';

  function playShootSound() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(110, audioCtx.currentTime + 0.2);

      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.2);
    } catch (e) {
      console.error('Audio context error:', e);
    }
  }

  function autoScroll() {
    setTimeout(() => scrollBottom?.scrollIntoView({ behavior: 'auto' }), 50);
    unreadMessages = false;
  }

  function normalizePayload(decrypted) {
    if (!decrypted) return null;

    if (typeof decrypted === 'string') {
      try {
        const parsed = JSON.parse(decrypted);
        if (parsed && parsed.type) {
          return parsed;
        }
      } catch (e) {
        // Continue with legacy format detection
      }

      if (decrypted.startsWith('data:image')) {
        return { type: 'media', mediaType: 'image', url: decrypted };
      }

      if (decrypted.startsWith('data:video')) {
        return { type: 'media', mediaType: 'video', url: decrypted };
      }

      return { type: 'text', text: decrypted };
    }

    if (typeof decrypted === 'object' && decrypted.type) {
      return decrypted;
    }

    return null;
  }

  function buildMessage(payload, who, avatar, when) {
    if (payload.type === 'media') {
      return {
        who,
        avatar,
        when,
        mediaType: payload.mediaType || 'image',
        mediaUrl: payload.url || '',
        mime: payload.mime || '',
        fileSize: payload.size || 0,
        fileName: payload.name || '',
        what: payload.url || '',
      };
    }

    return {
      who,
      avatar,
      when,
      text: payload.text || '',
      what: payload.text || '',
    };
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(event.target.result);
      reader.onerror = () => reject(new Error('Failed to read file.'));
      reader.readAsDataURL(file);
    });
  }

  function watchScroll(e) {
    canAutoScroll = (e.target.scrollTop || Infinity) > lastScrollTop;
    lastScrollTop = e.target.scrollTop;
  }

  $: debouncedWatchScroll = debounce(watchScroll, 1000);

  onMount(() => {
    var match = {
      // lexical queries are kind of like a limited RegEx or Glob.
      '.': {
        // property selector
        '>': new Date(+new Date() - 1 * 1000 * 60 * 60 * 24 * 30).toISOString(), // find any indexed property larger ~30 days ago
      },
      '-': 1, // filter in reverse
    };

    // Get Messages
    db.get('chat')
      .map(match)
      .once(async (data, id) => {
        if (data) {
          const decrypted = await SEA.decrypt(data.what, ENCRYPTION_KEY);
          const payload = normalizePayload(decrypted);

          if (payload) {
            const message = buildMessage(
              payload,
              await db.user(data).get('alias'),
              await db.user(data).get('avatar'),
              GUN.state.is(data, 'what')
            );

            messages = [...messages.slice(-100), message].sort((a, b) => a.when - b.when);
            if (canAutoScroll) {
              autoScroll();
            } else {
              unreadMessages = true;
            }
          }
        }
      });
  });

  async function sendMessage() {
    if (!newMessage) return;

    const payload = JSON.stringify({
      v: 2,
      type: 'text',
      text: newMessage,
    });

    isShooting = true;
    playShootSound();
    setTimeout(() => (isShooting = false), 200);

    const secret = await SEA.encrypt(payload, ENCRYPTION_KEY);
    const message = user.get('all').set({ what: secret });
    const index = new Date().toISOString();
    db.get('chat').get(index).put(message);
    newMessage = '';
    canAutoScroll = true;
    autoScroll();
  }

  async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    uploadError = '';
    uploadStatus = 'Preparing upload...';
    uploadInProgress = true;

    try {
      const uploaded = await prepareAndUploadMedia(file, (status) => {
        uploadStatus = status;
      });

      const payload = JSON.stringify({
        v: 2,
        type: 'media',
        mediaType: uploaded.mediaType,
        url: uploaded.url,
        mime: uploaded.mime,
        name: uploaded.name,
        size: uploaded.size,
      });

      isShooting = true;
      playShootSound();

      const secret = await SEA.encrypt(payload, ENCRYPTION_KEY);
      const message = user.get('all').set({ what: secret });
      const index = new Date().toISOString();
      db.get('chat').get(index).put(message);

      setTimeout(() => (isShooting = false), 200);
      canAutoScroll = true;
      autoScroll();
      uploadStatus = 'Upload complete.';
      setTimeout(() => (uploadStatus = ''), 1800);
    } catch (error) {
      const imageLike = file.type.startsWith('image/');

      if (imageLike && file.size <= 8 * 1024 * 1024) {
        try {
          uploadStatus = 'Using local fallback for image...';
          const localDataUrl = await fileToDataUrl(file);
          const payload = JSON.stringify({
            v: 2,
            type: 'media',
            mediaType: file.type === 'image/gif' ? 'gif' : 'image',
            url: localDataUrl,
            mime: file.type,
            name: file.name,
            size: file.size,
          });

          const secret = await SEA.encrypt(payload, ENCRYPTION_KEY);
          const message = user.get('all').set({ what: secret });
          const index = new Date().toISOString();
          db.get('chat').get(index).put(message);

          uploadStatus = 'Image sent (fallback mode).';
          setTimeout(() => (uploadStatus = ''), 1800);
          canAutoScroll = true;
          autoScroll();
        } catch (fallbackError) {
          uploadError = fallbackError && fallbackError.message ? fallbackError.message : 'Upload failed. Please try again.';
          uploadStatus = '';
        }
      } else {
        uploadError = 'Video upload failed. Configure a high-capacity upload endpoint for large videos.';
        uploadStatus = '';
      }
    } finally {
      uploadInProgress = false;
      e.target.value = '';
    }
  }
</script>

<div class="container" class:recoil={isShooting}>
  {#if $username}
    {#if $username === 'admin'}
      <AdminPanel />
    {/if}

    <main on:scroll={debouncedWatchScroll} role="log" aria-live="polite" aria-relevant="additions">
      {#each messages as message (message.when)}
        <ChatMessage {message} sender={$username} />
      {/each}

      <div class="dummy" bind:this={scrollBottom} />
    </main>

    <form on:submit|preventDefault={sendMessage} aria-label="Send a message">
      <label for="chat-file-upload" class="attach-btn" title="Upload image/gif/video">
        📎
      </label>
      <input 
        type="file" 
        id="chat-file-upload" 
        on:change={handleFileUpload} 
        accept="image/*,video/*,.mp4,.webm,.mov,.m4v,.avi,.mkv,.wmv,.flv,.3gp,.mpeg,.mpg,.ogv,.ts" 
        style="display: none;" 
      />

      <input
        type="text"
        placeholder="Type a message..."
        bind:value={newMessage}
        maxlength="100"
        required
        autocomplete="off"
        enterkeyhint="send"
        aria-label="Message"
      />

      <button type="submit" disabled={!newMessage || uploadInProgress}>Shoot</button>
    </form>

    {#if uploadStatus}
      <div class="upload-status" role="status" aria-live="polite">{uploadStatus}</div>
    {/if}

    {#if uploadError}
      <div class="upload-status upload-error" role="status" aria-live="polite">{uploadError}</div>
    {/if}


    {#if !canAutoScroll}
    <div class="scroll-button">
      <button on:click={autoScroll} class:red={unreadMessages} aria-label="Jump to latest messages">
        {#if unreadMessages}
          💬
        {/if}

        👇
      </button>
    </div>
   {/if}
  {:else}
    <main>
      <Login />
    </main>
  {/if}
</div>