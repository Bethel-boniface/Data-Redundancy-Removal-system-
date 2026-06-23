const apiPrefix = '/api';
const baseUrl = `${apiPrefix}/v1/data`;

const submitForm = document.getElementById('submit-form');
const validateForm = document.getElementById('validate-form');
const submitResult = document.getElementById('submit-result');
const validateResult = document.getElementById('validate-result');
const statsElement = document.getElementById('stats');
const refreshStats = document.getElementById('refresh-stats');

const setResult = (element, value) => {
  element.textContent = JSON.stringify(value, null, 2);
};

const parseJson = (value) => {
  if (!value.trim()) return null;
  try {
    return JSON.parse(value);
  } catch (error) {
    return { error: 'Invalid JSON' };
  }
};

const postData = async (endpoint, body) => {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  return response.json();
};

const fetchStats = async () => {
  const response = await fetch(`${baseUrl}/stats/overview`);
  const payload = await response.json();
  setResult(statsElement, payload);
};

submitForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const content = parseJson(document.getElementById('content').value);
  const metadata = parseJson(document.getElementById('metadata').value);

  if (content?.error || metadata?.error) {
    setResult(submitResult, {
      success: false,
      error: 'Invalid JSON in content or metadata',
    });
    return;
  }

  const result = await postData(`${baseUrl}/add`, { content, metadata });
  setResult(submitResult, result);
});

validateForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const content = parseJson(document.getElementById('validate-content').value);
  const metadata = parseJson(document.getElementById('validate-metadata').value);

  if (content?.error || metadata?.error) {
    setResult(validateResult, {
      success: false,
      error: 'Invalid JSON in content or metadata',
    });
    return;
  }

  const result = await postData(`${baseUrl}/validate`, { content, metadata });
  setResult(validateResult, result);
});

refreshStats.addEventListener('click', fetchStats);
fetchStats();
