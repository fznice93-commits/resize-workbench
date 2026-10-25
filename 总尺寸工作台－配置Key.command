#!/bin/zsh
cd "${0:A:h}"
/usr/bin/python3 "启动工具/launch.py" general key
if [[ $? -ne 0 ]]; then read "?按回车关闭…"; fi
