export async function executeCode(language, code) {
  try {
    const response = await fetch("http://localhost:3000/run", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}