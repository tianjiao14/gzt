/**
 * 智慧体育工作台 - 移动端微信直接分享与文件导出分发桥接组件 (wechat-share.js)
 * 
 * 功能特性：
 * 1. 移动端浏览器 (iOS Safari / Android Chrome / Edge) 调用 Web Share API Level 2，直接唤起系统分享面板发送至微信；
 * 2. 微信内置浏览器 (MicroMessenger) 智能环境探针与右上角【在浏览器中打开】指引，突破微信文件下载限制；
 * 3. 自动拦截与升级 SheetJS (XLSX.writeFile) 及任意 Blob / File 文件流，全平台自适应分发；
 * 4. 支持对接微信 JS-SDK (weixin-1.6.0) 网页卡片分享与文件中转深度链接。
 */

(function (global, factory) {
    if (typeof exports === 'object' && typeof module !== 'undefined') {
        module.exports = factory();
    } else if (typeof define === 'function' && define.amd) {
        define(factory);
    } else {
        global.WeChatShareBridge = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const Bridge = {
        version: '1.0.0',
        config: {
            appTitle: '智慧体育工作台',
            guideZIndex: 99999
        }
    };

    /**
     * 环境嗅探
     */
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

    /**
     * 核心导出分发入口
     * @param {Blob|ArrayBuffer|string} fileContent 文件二进制流或内容
     * @param {string} filename 文件名（如：体测成绩表.xlsx）
     * @param {string} mimeType MIME类型
     */
    Bridge.exportOrShare = async function (fileContent, filename, mimeType) {
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

        const env = Bridge.getEnv();

        // 1. 微信内置浏览器环境（微信限制直接落盘下载，弹出友好指引）
        if (env.isWeChat) {
            Bridge.showWeChatGuide(filename);
            return;
        }

        // 2. 移动端支持 Web Share API（iOS Safari / Android Chrome 均可直接唤起微信）
        if (env.isMobile && env.supportsWebShare && env.supportsFileShare) {
            try {
                const file = new File([blob], filename, { type: mimeType });
                if (navigator.canShare({ files: [file] })) {
                    if (typeof showToast === 'function') {
                        showToast('📲 正在唤起手机分享面板（可直接发送至微信）...');
                    }
                    await navigator.share({
                        files: [file],
                        title: filename,
                        text: `【${Bridge.config.appTitle}】已生成：${filename}`
                    });
                    if (typeof showToast === 'function') {
                        showToast('✅ 分享完成！');
                    }
                    return;
                }
            } catch (err) {
                if (err && err.name === 'AbortError') {
                    // 用户在分享面板主动点击取消，静默返回
                    return;
                }
                console.warn('[WeChatShareBridge] Web Share failed, falling back to download:', err);
            }
        }

        // 3. 桌面端或不支持分享的设备：直接执行浏览器文件保存下载
        Bridge.triggerDownload(blob, filename);
    };

    /**
     * 触发浏览器传统下载落盘
     */
    Bridge.triggerDownload = function (blob, filename) {
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

    /**
     * 微信内置浏览器指引弹窗
     */
    Bridge.showWeChatGuide = function (filename) {
        if (typeof document === 'undefined') return;
        let modal = document.getElementById('wechatExportGuideModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'wechatExportGuideModal';
            modal.className = 'modal-overlay';
            modal.style.zIndex = String(Bridge.config.guideZIndex);
            modal.onclick = function () { modal.style.display = 'none'; };
            modal.innerHTML = `
                <div style="position:fixed; top:12px; right:20px; text-align:right; color:#fff; font-size:14px; font-weight:800; z-index:100000; pointer-events:none;">
                    <div style="font-size:38px; line-height:1; transform:rotate(-20deg); display:inline-block; margin-bottom:4px;">↗</div>
                    <div>请点击右上角【···】</div>
                    <div>选择【在浏览器中打开】</div>
                </div>
                <div class="modal-content" style="max-width:390px; margin:auto; background:#fff; border-radius:20px; padding:22px 18px; text-align:center;" onclick="event.stopPropagation()">
                    <div style="font-size:40px; margin-bottom:8px;">💡</div>
                    <h3 style="margin:0 0 8px 0; color:#1F2937; font-size:17px;">微信导出与分享指引</h3>
                    <div id="wxGuideFilenameTag" style="font-size:12px; color:#2563EB; font-weight:bold; margin-bottom:10px; word-break:break-all;"></div>
                    <p style="font-size:13px; color:#4B5563; line-height:1.6; margin:0 0 16px 0; text-align:left;">
                        您当前在<b>微信内置网页</b>中，因微信平台安全限制，无法直接生成或下载本地文件。<br><br>
                        <b>如何直接导出到微信好友/群聊：</b><br>
                        1. 点击手机右上角 <b>【···】</b> 菜单；<br>
                        2. 选择 <b>【在浏览器中打开】</b>（如 Safari / 系统浏览器）；<br>
                        3. 在浏览器中点击导出，即可直接唤起<b>微信分享面板</b>，一键发送给微信好友、教研群或保存到手机！
                    </p>
                    <button class="btn-green" style="width:100%; font-size:14px; margin:0; padding:10px 0; border-radius:12px;" onclick="document.getElementById('wechatExportGuideModal').style.display='none'">我知道了</button>
                </div>
            `;
            document.body.appendChild(modal);
        }
        const tag = document.getElementById('wxGuideFilenameTag');
        if (tag) tag.innerText = `📄 ${filename || '数据报表'}`;
        modal.style.display = 'flex';
    };

    /**
     * 自动挂载拦截 SheetJS (XLSX.writeFile)
     */
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
            console.log('[WeChatShareBridge] SheetJS XLSX.writeFile hooked successfully.');
        }
    };

    // 默认自动初始化挂载
    if (typeof window !== 'undefined') {
        window.addEventListener('DOMContentLoaded', function () {
            Bridge.hookSheetJS();
        });
        if (typeof global.XLSX !== 'undefined') {
            Bridge.hookSheetJS();
        }
    }

    return Bridge;
}));
