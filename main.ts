import { Plugin } from 'obsidian';

export default class MyPlugin extends Plugin {
  async onload() {
    console.log('hello world!');
  }
}
