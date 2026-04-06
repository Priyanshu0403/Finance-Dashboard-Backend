import app from "./app.js";

const PORT = process.env.PORT ?? 3000;

app.listen(PORT, () => {
  console.log(`Finance Dashboard API running on http://localhost:${PORT}`);
});
