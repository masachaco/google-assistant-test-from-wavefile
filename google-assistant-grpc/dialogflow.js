/**
 * Copyright 2017, Google, Inc.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const dialogflow = require('dialogflow');

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