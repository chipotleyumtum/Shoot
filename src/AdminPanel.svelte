<script>
  import { onMount } from 'svelte';
  import { db } from './user';

  let users = [];
  const byAlias = {};

  function formatTs(ts) {
    if (!ts) return 'n/a';
    return new Date(ts).toLocaleString();
  }

  onMount(() => {
    const index = db.get('userIndex').map();

    index.on((entry, key) => {
      if (!entry || !entry.alias) return;

      byAlias[key] = {
        alias: entry.alias,
        createdAt: entry.createdAt || byAlias[key]?.createdAt || 0,
        lastSeen: entry.lastSeen || 0,
      };

      users = Object.values(byAlias).sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0));
    });

    return () => {
      index.off();
    };
  });
</script>

<section class="admin-panel" aria-label="Admin user overview">
  <h3>Admin Overview</h3>
  <p class="admin-note">Usernames and activity only. Passwords are never readable.</p>

  {#if users.length === 0}
    <p class="empty">No indexed users yet.</p>
  {:else}
    <ul>
      {#each users as u}
        <li>
          <span class="alias">{u.alias}</span>
          <span class="meta">Joined: {formatTs(u.createdAt)}</span>
          <span class="meta">Last seen: {formatTs(u.lastSeen)}</span>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  .admin-panel {
    margin: 0 1rem 0.7rem;
    padding: 0.8rem 0.9rem;
    border-radius: 0.8rem;
    border: 1px solid rgba(59, 130, 246, 0.35);
    background: rgba(7, 12, 22, 0.72);
    text-align: left;
  }

  h3 {
    margin: 0 0 0.25rem;
    font-size: 0.96rem;
    color: #d9e8ff;
  }

  .admin-note {
    margin: 0 0 0.6rem;
    font-size: 0.76rem;
    color: #9bb7df;
  }

  .empty {
    margin: 0;
    color: #9ca3af;
    font-size: 0.82rem;
  }

  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    max-height: 180px;
    overflow: auto;
  }

  li {
    display: grid;
    gap: 0.1rem;
    padding: 0.45rem 0.2rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }

  li:last-child {
    border-bottom: none;
  }

  .alias {
    color: #f4f7ff;
    font-weight: 600;
  }

  .meta {
    color: #9fb2cf;
    font-size: 0.76rem;
  }
</style>
