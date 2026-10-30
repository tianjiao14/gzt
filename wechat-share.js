/**
 * 智慧体育工作台 - 移动端微信直接分享与全端文件导出分发桥接组件 (wechat_share.js / wechat-share.js)
 *
(function (global, factory) {
    if (typeof exports === 'object' && typeof module !== 'undefined') {
        module.exports = factory();
    } else if (typeof define === 'function' && define.amd) {
        define(factory);
    } else {
        const mod = factory();
        global.WeChatShareBridge = mod;
        global.wechatShareBridge = mod;
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const Bridge = {
        version: '2.0.0',
        currentFile: null,
        config: {
            appTitle: '智慧体育工作台',
            zIndex: 99999
        }
    };

    Bridge.getEnv = function () {
        const ua = (typeof navigator !== 'undefined' && navigator.userAgent) ? navigator.userAgent : '';
        return {
            isWeChat: /MicroMessenger/i.test(ua),
            isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua),
            isIOS: /iPhone|iPad|iPod/i.test(ua),
            isAndroid: /Android/i.test(ua),
            supportsWebShare: (typeof navigator !== 'undefined' && typeof navigator.share === 'function'),
            supportsFileShare: (typeof navigator !== 'undefined' && typeof navigator.canShare === 'function')
        };
    };

    Bridge.formatSize = function (bytes) {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    Bridge.exportOrShare = function (fileContent, filename, mimeType) {
        if (!mimeType) {
            if (filename.endsWith('.xlsx')) mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            else if (filename.endsWith('.doc')) mimeType = 'application/msword';
            else if (filename.endsWith('.json')) mimeType = 'application/json';
            else mimeType = 'application/octet-stream';
        }

        let blob = null;
        if (fileContent instanceof Blob) {
            blob = fileContent;
        } else if (fileContent instanceof ArrayBuffer || ArrayBuffer.isView(fileContent)) {
            blob = new Blob([fileContent], { type: mimeType });
        } else {
            blob = new Blob([fileContent], { type: mimeType });
        }

        let file = null;
        try {
            file = new File([blob], filename, { type: mimeType });
        } catch (e) {
            file = blob;
        }

        const env = Bridge.getEnv();

        if (!env.isMobile && !env.isWeChat) {
            Bridge.triggerDirectDownload(blob, filename);
            if (typeof showToast === 'function') {
                showToast('💾 已导出文件：' + filename);
            }
            return;
        }

        Bridge.currentFile = {
            blob: blob,
            file: file,
            filename: filename,
            mimeType: mimeType,
            sizeStr: Bridge.formatSize(blob.size)
        };

        Bridge.showMobileShareModal(Bridge.currentFile);
    };

    Bridge.showMobileShareModal = function (fileObj) {
        if (typeof document === 'undefined') return;
        const env = Bridge.getEnv();

        let modal = document.getElementById('mobileShareActionModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'mobileShareActionModal';
            modal.className = 'modal-overlay';
            modal.style.zIndex = String(Bridge.config.zIndex);
            modal.onclick = function (e) {
                if (e.target.id === 'mobileShareActionModal') {
                    Bridge.closeMobileShareModal();
                }
            };
            document.body.appendChild(modal);
        }

        let icon = '📊';
        if (fileObj.filename.endsWith('.doc')) icon = '📄';
        else if (fileObj.filename.endsWith('.json')) icon = '🗄️';

        let contentHtml = '';

        if (env.isWeChat) {
            contentHtml = `
                <div style="position:fixed; top:12px; right:20px; text-align:right; color:#fff; font-size:14px; font-weight:800; z-index:100000; pointer-events:none;">
                    <div style="font-size:38px; line-height:1; transform:rotate(-20deg); display:inline-block; margin-bottom:4px;">↗</div>
                    <div>请点击右上角【···】</div>
                    <div>选择【在浏览器中打开】</div>
                </div>
                <div class="modal-content" style="max-width:390px; margin:auto; background:#fff; border-radius:24px; padding:22px 18px; text-align:center;" onclick="event.stopPropagation()">
                    <div style="font-size:42px; margin-bottom:8px;">💡</div>
                    <h3 style="margin:0 0 6px 0; color:#1F2937; font-size:17px;">微信环境直接发送指引</h3>
                    <div style="font-size:13px; color:#2563EB; font-weight:bold; margin-bottom:12px; word-break:break-all;">
                        ${icon} ${fileObj.filename} (${fileObj.sizeStr})
                    </div>
                    <div style="background:#FFF7ED; border:1px solid #FDBA74; border-radius:12px; padding:12px; text-align:left; font-size:12.5px; color:#9A3412; line-height:1.6; margin-bottom:14px;">
                        📌 <b>微信平台限制说明：</b><br>
                        微信内置浏览器出于平台安全策略，屏蔽了网页直接生成并传输本地文件。<br><br>
                        <b>实现直接发微信的方法：</b><br>
                        1. 点击右上角 <b>【···】</b> 菜单；<br>
                        2. 选择 <b>【在浏览器中打开】</b>（如 Safari 或系统浏览器）；<br>
                        3. 在浏览器中点击导出，即可一键直接<b>唤起微信分享</b>发给好友或教研群！
                    </div>
                    <button class="btn-green" style="width:100%; font-size:14px; margin:0; padding:10px 0; border-radius:12px; background:#07C160;" onclick="WeChatShareBridge.closeMobileShareModal()">我知道了</button>
                </div>
            `;
        } else {
            contentHtml = `
                <div class="modal-content" style="max-width:420px; width:92%; margin:auto; background:#fff; border-radius:24px; padding:24px 18px; text-align:center; box-shadow:0 -8px 32px rgba(0,0,0,0.18);" onclick="event.stopPropagation()">
                    <div style="font-size:42px; margin-bottom:6px;">${icon}</div>
                    <h3 style="margin:0 0 4px 0; color:#1F2937; font-size:18px;">文件已成功生成</h3>
                    <div style="font-size:13px; color:#2563EB; font-weight:bold; margin-bottom:16px; word-break:break-all; background:#EFF6FF; padding:6px 10px; border-radius:8px;">
                        ${fileObj.filename} <span style="color:#64748B; font-weight:normal;">(${fileObj.sizeStr})</span>
                    </div>

                    <button id="btnModalWeChatShare" onclick="WeChatShareBridge.triggerWeChatShare()" 
                            style="width:100%; font-size:16px; font-weight:800; padding:13px 0; margin-bottom:10px; background:#07C160; color:#fff; border:none; border-radius:14px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; box-shadow:0 4px 14px rgba(7,193,96,0.32);">
                        <span style="font-size:20px;">💬</span>
                        <span>直接分享到微信 (发给好友/群聊)</span>
                    </button>

                    <button onclick="WeChatShareBridge.triggerLocalDownload()" 
                            style="width:100%; font-size:14px; font-weight:700; padding:11px 0; margin-bottom:12px; background:#F1F5F9; color:#334155; border:1px solid #CBD5E1; border-radius:12px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px;">
                        <span>📥</span>
                        <span>保存 / 下载到手机本地</span>
                    </button>

                    <div style="font-size:11px; color:#94A3B8; margin-bottom:12px;">
                        提示：点击绿色按钮调出手机系统分享面板，直接选择【微信】即可发送。
                    </div>

                    <button onclick="WeChatShareBridge.closeMobileShareModal()" 
                            style="width:100%; font-size:13px; padding:8px 0; margin:0; background:#E2E8F0; color:#64748B; border:none; border-radius:10px; cursor:pointer;">
                        取消
                    </button>
                </div>
            `;
        }

        modal.innerHTML = contentHtml;
        modal.style.display = 'flex';
    };

    Bridge.closeMobileShareModal = function () {
        const modal = document.getElementById('mobileShareActionModal');
        if (modal) modal.style.display = 'none';
    };

    Bridge.triggerWeChatShare = async function () {
        if (!Bridge.currentFile) return;
        const { file, filename, blob, mimeType } = Bridge.currentFile;
        const env = Bridge.getEnv();

        if (env.isWeChat) {
            Bridge.showWeChatGuide(filename);
            return;
        }

        if (env.supportsWebShare) {
            try {
                if (env.supportsFileShare && navigator.canShare({ files: [file] })) {
                    Bridge.closeMobileShareModal();
                    await navigator.share({
                        files: [file],
                        title: filename,
                        text: `【${Bridge.config.appTitle}】已生成：${filename}`
                    });
                    if (typeof showToast === 'function') {
                        showToast('✅ 已成功调起分享！');
                    }
                    return;
                }
            } catch (err) {
                if (err && err.name === 'AbortError') {
                    return;
                }
                console.warn('[WeChatShareBridge] Direct file share failed:', err);
            }
        }

        Bridge.triggerDirectDownload(blob, filename);
        Bridge.closeMobileShareModal();
        if (typeof showToast === 'function') {
            showToast('📥 已将【' + filename + '】保存至手机！可在微信聊天中直接【发送文件】选择。');
        }
    };

    Bridge.triggerLocalDownload = function () {
        if (!Bridge.currentFile) return;
        const { blob, filename } = Bridge.currentFile;
        Bridge.triggerDirectDownload(blob, filename);
        Bridge.closeMobileShareModal();
        if (typeof showToast === 'function') {
            showToast('📥 正在下载保存【' + filename + '】...');
        }
    };

    Bridge.triggerDirectDownload = function (blob, filename) {
        if (typeof document === 'undefined') return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(function () {
            if (a.parentNode) a.parentNode.removeChild(a);
            URL.revokeObjectURL(url);
        }, 500);
    };

    Bridge.hookSheetJS = function () {
        if (typeof global.XLSX !== 'undefined') {
            const originalWriteFile = global.XLSX.writeFile;
            global.XLSX.writeFile = function (wb, filename, opts) {
                try {
                    const wbout = global.XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
                    Bridge.exportOrShare(wbout, filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                } catch (e) {
                    console.warn('[WeChatShareBridge] XLSX.write failed, falling back to original writeFile:', e);
                    if (typeof originalWriteFile === 'function') {
                        originalWriteFile.call(global.XLSX, wb, filename, opts);
                    }
                }
            };
        }
    };

    if (typeof window !== 'undefined') {
        if (document.readyState === 'loading') {
            window.addEventListener('DOMContentLoaded', function () {
                Bridge.hookSheetJS();
            });
        } else {
            Bridge.hookSheetJS();
        }
        if (typeof global.XLSX !== 'undefined') {
            Bridge.hookSheetJS();
        }
    }

    return Bridge;
}));
