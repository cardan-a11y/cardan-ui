import withNuxt from './.playground/.nuxt/eslint.config.mjs';

export default withNuxt().override('nuxt/vue/rules', {
  rules: {
    'vue/html-self-closing': 'off',
    'vue/multi-word-component-names': 'off',
  },
});
