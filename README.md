# 音声ファイルから Google Assistant アプリを自動テストするやつ

# 注意事項

これは作成途中のα版未満で、実運用には向きません。

# 概要

[googlesamples/assistant-sdk-nodejs](https://github.com/googlesamples/assistant-sdk-nodejs) を元に、音声ファイルからリクエストを送れるように変更しました。

[googlesamples/assistant-sdk-nodejs](https://github.com/googlesamples/assistant-sdk-nodejs) ではテキストの送信のみでしたが、それを改変してモノラル、PCM符号付16bitのwaveファイルからGoogle Assistantにリクエストを送れるようにしました。

また、録音した音声から、どのインテントに落ちたかテストできるようにしました。

# 使い方

長いのでQiitaに記載しました。
[https://qiita.com/masachaco/items/17983f4aa1656aae19fa](https://qiita.com/masachaco/items/17983f4aa1656aae19fa)

## wavファイルのフォーマット

リクエストに使用するwavファイルは以下の形式である必要があります。

- WAV (Microsoft) 16bit PCM符号あり
- モノラル
- サンプリングレート 16000Hz

## 使用例

```node

/** テストするGoogle Assistaに統合されている、DialogflowのProject ID */
process.env.DIALOGFLOW_PROJECT_ID = '** Set your testing dialogflow project id. **';

/**
 * Dialogflow API にアクセスするための credential JSONのパス
 * @see https://github.com/googleapis/nodejs-dialogflow
 */
process.env.DIALOGFLOW_CREDENTIAL = './credentials/dialogflow-credential.json';

/**
 * Assistant Deviceとして登録されたデバイスの Credential JSONのパス
 */
process.env.DEVICE_CREDENTIAL = './credentials/test-credentials.json';

/**
 * リクエストに使用するwavファイルが保存されているパス
 */
process.env.WAVE_FILES_PATH = './waves/';

const GoogleAssistantWavTest = require('google-assistant-test-from-wavefile');
const assistant = new GoogleAssistantWavTest();

// テストに時間がかかるのでタイムアウトの時間を延長
jest.setTimeout(30000);

/** Google Assistantとの接続をセットアップ */
beforeAll(async () => {
    await assistant.setUp();
});

/** 「終了」を発話して、何らかのアシスタントアプリに入っているステータスの場合は抜け出す */
beforeEach(async () => {
    await assistant.initConversation();
});

/** 「終了」を発話して、アシスタントアプリに入っているステータスから抜け出す */
afterAll(async () => {
    await assistant.shutdownConversation();
});

test('Default Welcome Intentが呼ばれることをテストする', async () => {
    // ./wave/call_action.wav の音声でGoogle Assistantにリクエストすると、Default Welcome Intent が呼ばれることをテスト
    expect(await assistant.callIntentByAudio('call_action.wav')).toBe('Default Welcome Intent');

    // ./test-wave-files/hello.wav の音声でGoogle Assistantにリクエストすると、HelloIntent が呼ばれることをテスト
    expect(await assistant.callIntentByAudio('hello.wav')).toBe('HelloIntent');
});

```

# ライセンス

[LISENCE](https://github.com/masachaco/google-assistant-test-from-wavefile/blob/master/LICENSE) の通りです。