* 智慧体育工作台 - 移动端微信直接分享与全端文件导出分发桥接组件

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
        version: '3.0.0',
        currentFile: null,
        config: {
            appTitle: '智慧体育工作台',
            zIndex: 99999
        }
    };

    Bridge.getEnv = function () {
        const ua = (typeof navigator !== 'undefined' && navigator.userAgent) ? navigator.userAgent : '';
        const isWeChat = /MicroMessenger/i.test(ua);
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
        const isIOS = /iPhone|iPad|iPod/i.test(ua);
        const isAndroid = /Android/i.test(ua);
        const isSecureContext = (typeof window !== 'undefined' && window.isSecureContext !== undefined) 
            ? window.isSecureContext 
            : (typeof location !== 'undefined' && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1'));
        
        let browserName = '常规手机浏览器';
        if (isWeChat) browserName = '微信内置网页';
        else if (/HuaweiBrowser|HUAWEI/i.test(ua)) browserName = '华为浏览器';
        else if (/MiuiBrowser|XiaoMi/i.test(ua)) browserName = '小米浏览器';
        else if (/VivoBrowser/i.test(ua)) browserName = 'vivo浏览器';
        else if (/HeyTapBrowser|OppoBrowser/i.test(ua)) browserName = 'OPPO浏览器';
        else if (/Quark/i.test(ua)) browserName = '夸克浏览器';
        else if (/UCBrowser/i.test(ua)) browserName = 'UC浏览器';
        else if (/QQBrowser/i.test(ua)) browserName = 'QQ浏览器';
        else if (/CriOS|Chrome/i.test(ua) && !/Edge|Edg/i.test(ua)) browserName = isIOS ? 'iOS Chrome' : 'Chrome浏览器';
        else if (isIOS && /Safari/i.test(ua)) browserName = '苹果 Safari';

        const supportsWebShare = (typeof navigator !== 'undefined' && typeof navigator.share === 'function');
        const supportsFileShare = (typeof navigator !== 'undefined' && typeof navigator.canShare === 'function');

        return {
            ua: ua,
            isWeChat: isWeChat,
            isMobile: isMobile,
            isIOS: isIOS,
            isAndroid: isAndroid,
            isSecureContext: isSecureContext,
            browserName: browserName,
            supportsWebShare: supportsWebShare,
            supportsFileShare: supportsFileShare
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

        // 桌面电脑端：直接触发常规下载
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
            // 微信内置浏览器专属指引
            contentHtml = `
                <div style="position:fixed; top:12px; right:20px; text-align:right; color:#fff; font-size:14px; font-weight:800; z-index:100000; pointer-events:none;">
                    <div style="font-size:38px; line-height:1; transform:rotate(-20deg); display:inline-block; margin-bottom:4px;">↗</div>
                    <div>请点击右上角【···】</div>
                    <div>选择【在浏览器中打开】</div>
                </div>
                <div class="modal-content" style="max-width:390px; width:92%; margin:auto; background:#fff; border-radius:24px; padding:22px 18px; text-align:center; box-shadow:0 -8px 32px rgba(0,0,0,0.2);" onclick="event.stopPropagation()">
                    <div style="font-size:42px; margin-bottom:8px;">💡</div>
                    <h3 style="margin:0 0 6px 0; color:#1F2937; font-size:17px;">微信内置环境直接发送指引</h3>
                    <div style="font-size:13px; color:#2563EB; font-weight:bold; margin-bottom:12px; word-break:break-all; background:#EFF6FF; padding:6px 10px; border-radius:8px;">
                        ${icon} ${fileObj.filename} (${fileObj.sizeStr})
                    </div>
                    <div style="background:#FFF7ED; border:1px solid #FDBA74; border-radius:12px; padding:12px; text-align:left; font-size:12.5px; color:#9A3412; line-height:1.6; margin-bottom:14px;">
                        📌 <b>微信官方限制说明：</b><br>
                        微信内置浏览器出于平台安全风控，屏蔽了所有网页直接调起系统分享与直接下载本地文件的权限。<br><br>
                        <b>如何立即发送到微信好友/群聊：</b><br>
                        1. 点击右上角 <b>【···】</b> 菜单；<br>
                        2. 选择 <b>【在浏览器中打开】</b>（如 Safari 或系统浏览器）；<br>
                        3. 在浏览器中点击导出，即可一键呼出微信分享或下载！
                    </div>
                    <button class="btn-green" style="width:100%; font-size:14px; margin:0; padding:10px 0; border-radius:12px; background:#07C160; border:none; color:#fff; font-weight:bold; cursor:pointer;" onclick="WeChatShareBridge.closeMobileShareModal()">我知道了</button>
                </div>
            `;
        } else {
            // 外部手机浏览器环境
            const shareSupportText = env.supportsWebShare ? (env.supportsFileShare ? '✅ 系统支持文件直发' : '⚡ 支持快速调起分享') : '📥 自动适配极速下载';

            contentHtml = `
                <div class="modal-content" style="max-width:420px; width:92%; margin:auto; background:#fff; border-radius:24px; padding:24px 18px; text-align:center; box-shadow:0 -8px 32px rgba(0,0,0,0.18);" onclick="event.stopPropagation()">
                    <div style="font-size:42px; margin-bottom:6px;">${icon}</div>
                    <h3 style="margin:0 0 4px 0; color:#1F2937; font-size:18px;">文件已成功生成</h3>
                    <div style="font-size:13px; color:#2563EB; font-weight:bold; margin-bottom:16px; word-break:break-all; background:#EFF6FF; padding:6px 10px; border-radius:8px;">
                        ${fileObj.filename} <span style="color:#64748B; font-weight:normal;">(${fileObj.sizeStr})</span>
                    </div>

                    <!-- 核心操作 1：调起系统分享发微信 -->
                    <button id="btnModalWeChatShare" onclick="WeChatShareBridge.triggerWeChatShare()" 
                            style="width:100%; font-size:16px; font-weight:800; padding:13px 0; margin-bottom:10px; background:#07C160; color:#fff; border:none; border-radius:14px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; box-shadow:0 4px 14px rgba(7,193,96,0.32); transition:all 0.2s;">
                        <span style="font-size:20px;">💬</span>
                        <span>直接分享到微信 (发给好友/群聊)</span>
                    </button>

                    <!-- 核心操作 2：极速保存到手机本地 -->
                    <button id="btnModalLocalDownload" onclick="WeChatShareBridge.triggerLocalDownload()" 
                            style="width:100%; font-size:14px; font-weight:700; padding:11px 0; margin-bottom:10px; background:#F1F5F9; color:#334155; border:1px solid #CBD5E1; border-radius:12px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px;">
                        <span>📥</span>
                        <span>保存 / 下载到手机本地</span>
                    </button>

                    <!-- 状态与指引动态提示区 -->
                    <div id="shareModalStatusTip" style="margin-bottom:12px;">
                        <div style="font-size:11.5px; color:#64748B; line-height:1.4;">
                            提示：点击绿色按钮调出手机系统分享面板，直接选择【微信】即可发送。
                        </div>
                    </div>

                    <!-- 底部环境与自检诊断小条 -->
                    <div style="font-size:10.5px; color:#94A3B8; background:#F8FAFC; border-radius:8px; padding:6px 8px; margin-bottom:14px; display:flex; justify-content:space-between; align-items:center;">
                        <span>📱 ${env.browserName}</span>
                        <span>${env.isSecureContext ? '🔒 HTTPS' : '⚠️ HTTP'} · ${shareSupportText}</span>
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
        const btn = document.getElementById('btnModalWeChatShare');
        const tipBox = document.getElementById('shareModalStatusTip');

        // 1. 微信内置网页拦截
        if (env.isWeChat) {
            Bridge.showMobileShareModal(Bridge.currentFile);
            return;
        }

        // 2. 检查 HTTPS 安全上下文
        if (!env.isSecureContext) {
            if (tipBox) {
                tipBox.innerHTML = '<span style="color:#DC2626; font-size:12px;">⚠️ 网页处于非安全链接(HTTP)，系统已禁止调用分享面板。已自动为您极速下载！</span>';
            }
            Bridge.triggerDirectDownload(blob, filename);
            return;
        }

        // 3. 视觉反馈：严禁在调起分享前关闭弹窗或隐藏 DOM（否则 WebKit 手势激活失效）
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<span>⏳</span><span>正在呼出手机系统分享面板...</span>';
            btn.style.opacity = '0.9';
        }

        let shareInvoked = false;

        // 4. 调用原生 Web Share API
        if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
            // 第一层：尝试文件直传分享
            try {
                let shareFile = file;
                if (!(shareFile instanceof File)) {
                    shareFile = new File([blob], filename, { type: mimeType || 'application/octet-stream' });
                }

                let canShareFile = false;
                try {
                    if (typeof navigator.canShare === 'function') {
                        canShareFile = navigator.canShare({ files: [shareFile] });
                    }
                } catch (e) {
                    canShareFile = false;
                }

                if (canShareFile || !navigator.canShare) {
                    await navigator.share({
                        files: [shareFile],
                        title: filename,
                        text: `【${Bridge.config.appTitle}】已生成：${filename}`
                    });
                    shareInvoked = true;
                }
            } catch (err) {
                // 用户在系统面板点击了“取消”，属于正常操作
                if (err && (err.name === 'AbortError' || err.code === 20)) {
                    if (btn) {
                        btn.disabled = false;
                        btn.innerHTML = '<span style="font-size:20px;">💬</span><span>直接分享到微信 (发给好友/群聊)</span>';
                        btn.style.opacity = '1';
                    }
                    return;
                }
                console.warn('[WeChatShareBridge] Direct file share failed, trying text fallback:', err);
            }

            // 第二层：若特定安卓机型不支持文件跨应用投递，尝试文本/链接分享
            if (!shareInvoked) {
                try {
                    await navigator.share({
                        title: filename,
                        text: `【${Bridge.config.appTitle}】已生成文件：${filename}\n请在微信聊天中点【+ ➔ 文件】发送。`
                    });
                    shareInvoked = true;
                } catch (e2) {
                    console.warn('[WeChatShareBridge] Text share fallback failed:', e2);
                }
            }
        }

        // 成功调起并完成分享后，关闭弹窗
        if (shareInvoked) {
            Bridge.closeMobileShareModal();
            if (typeof showToast === 'function') {
                showToast('✅ 已成功调起分享！');
            }
            return;
        }

        // 第三层：若当前手机浏览器完全未开放系统分享接口（如华为、小米、OPPO等国内安卓机自带浏览器）
        // 绝不静默闪退！自动触发极速本地下载，并展开“微信发文件两步法”图文指引
        Bridge.triggerDirectDownload(blob, filename);

        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<span style="font-size:18px;">📥</span><span>已下载至手机！点击重新下载</span>';
            btn.style.background = '#2563EB';
            btn.style.boxShadow = '0 4px 14px rgba(37,99,235,0.32)';
            btn.style.opacity = '1';
        }

        if (tipBox) {
            tipBox.innerHTML = `
                <div style="background:#FEF3C7; border:1px solid #F59E0B; border-radius:12px; padding:12px; text-align:left; font-size:12px; color:#92400E; line-height:1.6; margin-top:8px;">
                    <div style="font-weight:bold; font-size:13px; margin-bottom:4px; display:flex; align-items:center; gap:4px;">
                        <span>📌</span> <span>当前手机浏览器未开放网页调起微信接口</span>
                    </div>
                    <div>文件 <b>【${filename}】</b> 已为您极速保存至手机中！</div>
                    <div style="margin-top:6px; padding-top:6px; border-top:1px dashed #FCD34D;">
                        <b>在微信中发送给好友或教研群（仅需两步）：</b><br>
                        1. 切换到微信，打开好友或群聊；<br>
                        2. 点击聊天框右下角 <b>【+】 ➔ 【文件】</b>；<br>
                        3. 列表最上方第一项就是刚导出的文件，点击发送即可！
                    </div>
                </div>
            `;
        }

        if (typeof showToast === 'function') {
            showToast(`📥 已保存【${filename}】！可在微信聊天中点【+ ➔ 文件】发送。`);
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
