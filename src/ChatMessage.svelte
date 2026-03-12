<script>
  export let message;
  export let sender;

  $: messageClass = message.who === sender ? 'sent' : 'received';

  $: displayName = message.who || 'Unknown';
  $: avatarSrc = message.avatar || `https://avatars.dicebear.com/api/initials/${displayName}.svg`;
  $: ts = new Date(message.when);
  let videoPlaybackFailed = false;

  function inferMediaType(msg) {
    if (msg.mediaType) return msg.mediaType;

    const raw = msg.mediaUrl || msg.what || '';
    if (raw.startsWith('data:image')) return 'image';
    if (raw.startsWith('data:video')) return 'video';
    if (/\.(gif)(\?|#|$)/i.test(raw)) return 'gif';
    if (/\.(mp4|webm|mov|m4v|ogg|avi|mkv|wmv|flv|3gp|mpe?g|ogv|ts)(\?|#|$)/i.test(raw)) return 'video';
    if (/\.(jpg|jpeg|png|webp|bmp|avif)(\?|#|$)/i.test(raw)) return 'image';
    return '';
  }

  $: mediaType = inferMediaType(message);
  $: mediaSrc = message.mediaUrl || message.what || '';
  $: isImage = mediaType === 'image' || mediaType === 'gif';
  $: isVideo = mediaType === 'video';
  $: textContent = message.text || message.what || '';

  function handleVideoError() {
    videoPlaybackFailed = true;
  }

  const fallbackAvatar = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23ccc'/%3E%3Cpath d='M50 50 L50 20' stroke='bg' stroke-width='2'/%3E%3Ccircle cx='50' cy='35' r='20' fill='%23666'/%3E%3Cpath d='M10 100 A 40 40 0 0 1 90 100' fill='%23666'/%3E%3C/svg%3E";
  function handleAvatarError(e) {
    e.target.src = fallbackAvatar;
    e.target.onerror = null; // Prevent infinite loop on fallback failure
  }
</script>

<div class={`message ${messageClass}`}>
  <img 
    src={avatarSrc} 
    on:error={handleAvatarError} 
    alt={`Avatar for ${displayName}`} 
    loading="lazy" 
  />
  <div class="message-text">
    {#if isImage}
      <img src={mediaSrc} alt="Sent media" class="media-content media-image" loading="lazy" />
    {:else if isVideo}
      {#if !videoPlaybackFailed}
        <!-- svelte-ignore a11y-media-has-caption -->
        <video controls preload="metadata" class="media-content media-video" on:error={handleVideoError}>
          <source src={mediaSrc} type={message.mime || 'video/mp4'} on:error={handleVideoError} />
          Your browser cannot play this video inline.
        </video>
      {/if}

      {#if videoPlaybackFailed}
        <div class="video-fallback">
          <p>Video codec unsupported for inline playback in this browser.</p>
          <a href={mediaSrc} target="_blank" rel="noopener noreferrer">Open video in new tab</a>
          <a href={mediaSrc} download>Download video</a>
        </div>
      {/if}
    {:else}
      <p>{textContent}</p>
    {/if}

    {#if message.fileName}
      <span class="media-name">{message.fileName}</span>
    {/if}

    <time datetime={ts.toISOString()}>{ts.toLocaleTimeString()}</time>
  </div>
</div>

<style>
  .media-content {
    max-width: 100%;
    max-height: 360px;
    border-radius: 10px;
    margin-bottom: 5px;
    background: #000;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.35);
  }

  .media-image {
    width: auto;
    height: auto;
    border-radius: 12px;
    margin: 0;
    object-fit: contain;
  }

  .media-video {
    width: min(100%, 460px);
    height: auto;
  }

  .media-name {
    font-size: 0.72rem;
    color: #9ca3af;
    margin-top: 0.25rem;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .video-fallback {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    align-items: flex-start;
    background: rgba(17, 24, 39, 0.72);
    border: 1px solid rgba(147, 197, 253, 0.3);
    border-radius: 10px;
    padding: 0.65rem 0.75rem;
    margin-bottom: 0.4rem;
  }

  .video-fallback p {
    margin: 0;
    font-size: 0.8rem;
    line-height: 1.25;
    color: #d1d5db;
  }

  .video-fallback a {
    font-size: 0.82rem;
    color: #93c5fd;
    text-decoration: underline;
  }
</style>
