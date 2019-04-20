const dialogflow = require('dialogflow');
const uuid = require('uuid');

/**
 * Send a query to the dialogflow agent, and return the query result.
 * @param {string} projectId The project to be used
 */
async function GetIntentMapper() {
  const projectId = process.env.DIALOGFLOW_PROJECT_ID;
  // Create a new session  
  const intentsClient = new dialogflow.IntentsClient();
  const projectAgentPath = intentsClient.projectAgentPath(projectId);
  const request = {
    parent: projectAgentPath,
  };
  // Send the request for listing intents.
  const [response] = await intentsClient.listIntents(request);
  const intents = {};
  response.forEach(intent => {
    const intentId = intent.name.replace(`projects/${projectId}/agent/intents/`, '');
    intents[intentId] = intent.displayName;
  });

  return intents;
}


module.exports = GetIntentMapper;