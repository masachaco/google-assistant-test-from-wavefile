# 音声ファイルから Google Assistantを自動テストするやつ

# 注意事項

これは作成途中のα版未満で、実運用には使用できません。

# 概要

[googlesamples/assistant-sdk-nodejs](https://github.com/googlesamples/assistant-sdk-nodejs) を元に、音声ファイルからリクエストを送れるように変更しました。

[googlesamples/assistant-sdk-nodejs](https://github.com/googlesamples/assistant-sdk-nodejs) ではテキストの送信のみでしたが、それを改変してモノラル、PCM符号付16bitのwaveファイルからGoogle Assistantにリクエストを送れるようにしました。

また、録音した音声から、どのインテントに落ちたかテストできるようにしました。

# ライセンス

[LISENCE](https://github.com/masachaco/assistant-sdk-nodejs/blob/master/LICENSE) の通りです。