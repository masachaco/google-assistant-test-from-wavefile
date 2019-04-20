/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 *
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

'use strict';
const path = require('path');
const grpc = require('grpc');
const protoFiles = require('google-proto-files');
const GoogleAuth = require('google-auth-library');
const fs = require('fs');

const PROTO_ROOT_DIR = protoFiles('..');
const embedded_assistant_pb = grpc.load({
    root: PROTO_ROOT_DIR,
    file: path.relative(PROTO_ROOT_DIR, protoFiles.embeddedAssistant.v1alpha2)
}).google.assistant.embedded.v1alpha2;

const sleep = (execute, waitTimeMiliSec) => {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(execute())
        }, waitTimeMiliSec);
    })
};


class GoogleAssistant {
    constructor(crendential) {
        const credentials = {
            client_id: crendential.client_id,
            client_secret: crendential.client_secret,
            refresh_token: crendential.refresh_token,
            type: "authorized_user"
        };

        GoogleAssistant.prototype.endpoint_ = "embeddedassistant.googleapis.com";
        this.client = this.createClient_(credentials);
        this.locale = "ja-JP";
        this.deviceModelId = 'default';
        this.deviceInstanceId = 'default';
    }


    createConfig_() {
        const config = new embedded_assistant_pb.AssistConfig();
        config.setAudioOutConfig(new embedded_assistant_pb.AudioOutConfig());
        config.getAudioOutConfig().setEncoding(embedded_assistant_pb.AudioOutConfig.Encoding.LINEAR16);
        config.getAudioOutConfig().setSampleRateHertz(16000);
        config.getAudioOutConfig().setVolumePercentage(100);
        config.setDialogStateIn(new embedded_assistant_pb.DialogStateIn());
        config.setDeviceConfig(new embedded_assistant_pb.DeviceConfig());

        config.setDebugConfig(new embedded_assistant_pb.DebugConfig());
        config.getDebugConfig().setReturnDebugInfo(true);

        config.getDialogStateIn().setLanguageCode(this.locale);
        config.getDeviceConfig().setDeviceId(this.deviceInstanceId);
        config.getDeviceConfig().setDeviceModelId(this.deviceModelId);
        return config;
    };

    createAuioInConfig_() {
        const audioInConfig = new embedded_assistant_pb.AudioInConfig();
        audioInConfig.setEncoding(embedded_assistant_pb.AudioInConfig.Encoding.LINEAR16)
        audioInConfig.setSampleRateHertz(16000)
        return audioInConfig;
    }

    createClient_(credentials) {
        const sslCreds = grpc.credentials.createSsl();
        // https://github.com/google/google-auth-library-nodejs/blob/master/ts/lib/auth/refreshclient.ts
        const auth = new GoogleAuth();
        const refresh = new auth.UserRefreshClient();
        refresh.fromJSON(credentials, function (res) { });
        const callCreds = grpc.credentials.createFromGoogleCredential(refresh);
        const combinedCreds = grpc.credentials.combineChannelCredentials(sslCreds, callCreds);
        const client = new embedded_assistant_pb.EmbeddedAssistant(this.endpoint_, combinedCreds);
        return client;
    }

    async startUp() {
        this.intentNameFromIntentId = await require('./google-assistant-grpc/dialogflow')();
    }

    async initConversation(exitFlowTextTexts = ["終了"]) {
        for (let i = 0; i < exitFlowTextTexts.length; i++) {
            await this.assistByText(exitFlowTextTexts[i]);
        }
        return;
    }

    exitConversation(exitTexts = ["終了"]) {
        return this.initConversation(exitTexts);
    }

    assistByAudio(filePath) {
        return this.assist(filePath, true);
    }

    async callIntentByAudio(filePath) {
        const response = await this.assist(filePath, true)
        return this.intentNameFromIntentId[response.matchedIntentId];
    }

    assistByText(query) {
        return this.assist(query);
    }

    sendWave(conversation, request, query) {
        // Unit8 Array
        console.log("Loading wave file... : " + query);
        const buffer = fs.readFileSync(query);

        const sendBuffer = (currentBuff) => {
            const buf = buffer.slice(currentBuff, currentBuff + 3200);

            // 3.2KBずつ送る。足りない場合は、0埋めする。
            const unit8Array = new Uint8Array(3200);
            for (let i = 0; i <= buf.length; i++) {
                unit8Array[i] = buf[i];
            }

            request.audio_in = unit8Array;
            conversation.write(request);

            if (this.stopSpeech) {
                conversation.end();
                return;
            }

            sleep(() => sendBuffer(currentBuff + 3200), 10);
        }

        sendBuffer(0);
    }

    assist(query, isAudio = false) {
        console.log("query:" + query);

        const request = new embedded_assistant_pb.AssistRequest();
        request.setConfig(this.createConfig_());

        delete request.audio_in;

        if (isAudio) {
            request.getConfig().setAudioInConfig(this.createAuioInConfig_());
        } else {
            request.getConfig().setTextQuery(query);
        }

        const conversation = this.client.assist();
        return new Promise((resolve, reject) => {
            let response = {};
            this.stopSpeech = false;
            let lastData = null;
            let matchedIntentId = null;

            conversation.on('data', (data) => {
                if (data.speech_results && data.speech_results.length > 0 && data.speech_results[0].transcript) {
                    //console.log(data.speech_results[0].transcript);
                    lastData = data.speech_results[0].transcript;
                }

                if (data.debug_info) {
                    const assistantJson = JSON.parse(data.debug_info.aog_agent_to_assistant_json);
                    matchedIntentId = assistantJson.responseMetadata.queryMatchInfo.intent;
                }

                if (isAudio) {
                    if (data.event_type === 'END_OF_UTTERANCE') {
                        this.stopSpeech = true;
                    }

                    if (data.dialog_state_out && data.dialog_state_out.microphone_mode == 'MICROPHONE_MODE_UNSPECIFIED') {
                        this.sendWave(conversation, request, query);
                    }
                }

                if (data.device_action) {
                    response.deviceAction = JSON.parse(data.device_action.device_request_json);
                } else if (data.dialog_state_out !== null && data.dialog_state_out.supplemental_display_text) {
                    response.text = data.dialog_state_out.supplemental_display_text;
                }
            });

            conversation.on('end', (error) => {
                // Response ended, resolve with the whole response.
                if (error) {
                    reject(error);
                }

                if (isAudio) {
                    sleep(() => {
                        response.query = lastData;
                        response.matchedIntentId = matchedIntentId;
                        console.log('User say: ' + response.query);
                        console.log('Assistant say: ' + response.text);
                        resolve(response);
                    }, 3000);
                } else {
                    console.log('User say: ' + query);
                    console.log('Assistant say: ' + response.text);
                    resolve(response);
                }
            });

            conversation.on('error', error => reject(error));
            conversation.on('finish', () => { });

            conversation.write(request);
            if (!isAudio) {
                conversation.end();
            }
        });
    }
}

module.exports = GoogleAssistant;