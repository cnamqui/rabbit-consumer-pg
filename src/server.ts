import App from './app';
const app = new App();

app.start().then(() => {
    console.log(`Server is running`);
});
