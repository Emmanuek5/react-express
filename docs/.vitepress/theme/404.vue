<template>
  <div class="not-found">
    <h1>404</h1>
    <div class="text">Page Not Found</div>
    <p class="message">
      Oops! The page you are looking for doesn't exist.
    </p>
    <a class="action" href="/" aria-label="go to home">
      Take me home
    </a>
  </div>
</template>

<style scoped>
.not-found {
  padding: 100px 24px;
  text-align: center;
}

.not-found h1 {
  margin: 0;
  font-size: 8rem;
  letter-spacing: 4px;
  background: linear-gradient(120deg, #bd34fe 30%, #41d1ff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.text {
  margin: 24px 0;
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: 2px;
}

.message {
  margin: 24px 0;
  font-size: 1.2rem;
  line-height: 1.5;
  color: var(--vp-c-text-2);
}

.action {
  display: inline-block;
  margin: 12px 0;
  padding: 12px 24px;
  border: 1px solid var(--vp-c-brand);
  border-radius: 24px;
  color: var(--vp-c-brand);
  font-size: 1rem;
  font-weight: 500;
  text-decoration: none;
  transition: all 0.2s;
}

.action:hover {
  color: var(--vp-c-white);
  background-color: var(--vp-c-brand);
}
</style>
