// 设备指纹和授权管理
const ADMIN_PASSWORD = "your_admin_password_here"; // 将这里改为你的密码
let accessCodes = new Map(); // 存储临时访问码

// 获取设备指纹
function getDeviceFingerprint() {
    const screen = `${window.screen.width},${window.screen.height},${window.screen.colorDepth}`;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const language = navigator.language;
    const platform = navigator.platform;
    const userAgent = navigator.userAgent;
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl');
    const debugInfo = gl ? gl.getExtension('WEBGL_debug_renderer_info') : null;
    const gpu = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : '';
    
    // 组合信息生成唯一标识
    const fingerprint = btoa(`${screen}-${timezone}-${language}-${platform}-${userAgent}-${gpu}`);
    return fingerprint;
}

// 检查设备是否已授权
function isDeviceAuthorized() {
    const deviceId = getDeviceFingerprint();
    const authorizedDevices = JSON.parse(localStorage.getItem('authorizedDevices') || '[]');
    return authorizedDevices.includes(deviceId);
}

// 授权设备
function authorizeDevice() {
    const deviceId = getDeviceFingerprint();
    const authorizedDevices = JSON.parse(localStorage.getItem('authorizedDevices') || '[]');
    if (!authorizedDevices.includes(deviceId)) {
        authorizedDevices.push(deviceId);
        localStorage.setItem('authorizedDevices', JSON.stringify(authorizedDevices));
    }
}

// 取消设备授权
function deauthorizeDevice(deviceId) {
    const authorizedDevices = JSON.parse(localStorage.getItem('authorizedDevices') || '[]');
    const index = authorizedDevices.indexOf(deviceId);
    if (index > -1) {
        authorizedDevices.splice(index, 1);
        localStorage.setItem('authorizedDevices', JSON.stringify(authorizedDevices));
    }
}

// 显示已授权设备列表
function showAuthorizedDevices() {
    const authorizedDevices = JSON.parse(localStorage.getItem('authorizedDevices') || '[]');
    let deviceList = '已授权设备列表：\n\n';
    authorizedDevices.forEach((deviceId, index) => {
        deviceList += `${index + 1}. ${deviceId}\n`;
    });
    alert(deviceList);
}

function switchToAdmin() {
    document.getElementById('adminLogin').style.display = 'block';
    document.getElementById('accessLogin').style.display = 'none';
}

function switchToAccess() {
    document.getElementById('adminLogin').style.display = 'none';
    document.getElementById('accessLogin').style.display = 'block';
}

function adminLogin() {
    const password = document.getElementById('adminPassword').value;
    if (password === ADMIN_PASSWORD) {
        const deviceId = getDeviceFingerprint();
        if (!isDeviceAuthorized()) {
            const confirm = window.confirm('此设备未授权，是否添加为授权设备？');
            if (confirm) {
                authorizeDevice();
            } else {
                alert('未授权此设备！');
                return;
            }
        }
        
        document.getElementById('generateBtn').style.display = 'block';
        document.getElementById('deviceManageBtn').style.display = 'block';
        document.getElementById('mainContent').style.display = 'block';
        document.getElementById('loginScreen').style.display = 'none';
    } else {
        alert('管理员密码错误！');
    }
}

function generateAccessCode() {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const expiry = Date.now() + (24 * 60 * 60 * 1000); // 24小时后过期
    accessCodes.set(code, expiry);
    alert(`临时访问码: ${code}\n有效期24小时`);
}

function checkAccessCode() {
    const code = document.getElementById('accessCode').value;
    const expiry = accessCodes.get(code);
    
    if (!isDeviceAuthorized()) {
        alert('此设备未经授权！请联系管理员授权此设备。');
        return;
    }
    
    if (expiry && Date.now() < expiry) {
        document.getElementById('mainContent').style.display = 'block';
        document.getElementById('loginScreen').style.display = 'none';
    } else {
        alert('访问码无效或已过期！');
    }
}

// 添加 remove.bg API 相关功能
async function removeBackground(imageFile) {
    const formData = new FormData();
    formData.append('image_file', imageFile);
    formData.append('size', 'auto');
    formData.append('bg_color', 'white');

    try {
        const response = await fetch('https://api.remove.bg/v1.0/removebg', {
            method: 'POST',
            headers: {
                'X-Api-Key': '1e8TnzmQhDBcgMNA7EDBQj8h' // 在这里替换为你的 API key
            },
            body: formData
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            return url;
        } else {
            throw new Error('背景移除失败');
        }
    } catch (error) {
        alert('背景移除失败：' + error.message);
        return null;
    }
}

// 调整片尺寸
function resizeImage(imageUrl, targetHeight) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            const ratio = targetHeight / img.height;
            const newWidth = img.width * ratio;
            
            canvas.width = newWidth;
            canvas.height = targetHeight;
            
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, newWidth, targetHeight);
            
            resolve(canvas.toDataURL('image/png'));
        };
        img.src = imageUrl;
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const uploadArea = document.getElementById('uploadArea');
    const imageInput = document.getElementById('imageInput');
    const previewSection = document.getElementById('previewSection');
    const originalPreview = document.getElementById('originalPreview');
    const compressedPreview = document.getElementById('compressedPreview');
    const originalSize = document.getElementById('originalSize');
    const compressedSize = document.getElementById('compressedSize');
    const qualitySlider = document.getElementById('quality');
    const qualityValue = document.getElementById('qualityValue');
    const downloadBtn = document.getElementById('downloadBtn');
    const removeBgBtn = document.getElementById('removeBgBtn');
    const targetHeight = document.getElementById('targetHeight');
    let currentFile = null; // 存储当前处理的文件

    let originalImage = null;

    // 上传区域点击事件
    uploadArea.addEventListener('click', () => {
        imageInput.click();
    });

    // 拖放功能
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#007AFF';
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.style.borderColor = '#E5E5E5';
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#E5E5E5';
        const file = e.dataTransfer.files[0];
        if (file && file.type.match('image.*')) {
            handleImageUpload(file);
        }
    });

    // 文件输入处理
    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleImageUpload(file);
        }
    });

    // 质量滑块事件
    qualitySlider.addEventListener('input', (e) => {
        qualityValue.textContent = `${e.target.value}%`;
        if (originalImage) {
            compressImage(originalImage, e.target.value / 100);
        }
    });

    // 处理图片上传
    function handleImageUpload(file) {
        if (file.size > 10 * 1024 * 1024) {
            alert('图片大小不能超过10MB');
            return;
        }
        currentFile = file; // 保存当前文件
        const reader = new FileReader();
        reader.onload = (e) => {
            originalImage = new Image();
            originalImage.src = e.target.result;
            originalImage.onload = () => {
                originalPreview.src = e.target.result;
                originalSize.textContent = formatFileSize(file.size);
                compressImage(originalImage, qualitySlider.value / 100);
                previewSection.style.display = 'block';
            };
        };
        reader.readAsDataURL(file);
    }

    // 压缩图片
    function compressImage(img, quality) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        compressedPreview.src = compressedDataUrl;

        const compressedSize = Math.round((compressedDataUrl.length - 22) * 3 / 4);
        document.getElementById('compressedSize').textContent = formatFileSize(compressedSize);

        downloadBtn.onclick = () => {
            const link = document.createElement('a');
            link.download = 'compressed_image.jpg';
            link.href = compressedDataUrl;
            link.click();
        };
    }

    // 格式化文件大小
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // 添加数据统计
    if (typeof gtag !== 'undefined') {
        downloadBtn.addEventListener('click', () => {
            gtag('event', 'download', {
                'event_category': 'compression',
                'event_label': 'image_downloaded'
            });
        });
    }

    // 添加抠图按钮事件处理
    removeBgBtn.addEventListener('click', async () => {
        if (!currentFile) {
            alert('请先上传图片');
            return;
        }

        removeBgBtn.disabled = true;
        removeBgBtn.textContent = '处理中...';

        try {
            // 移除背景
            const removedBgUrl = await removeBackground(currentFile);
            if (!removedBgUrl) {
                throw new Error('背景移除失败');
            }

            // 调整尺寸
            const height = parseInt(targetHeight.value) || 1001;
            const resizedUrl = await resizeImage(removedBgUrl, height);

            // 更新预览和下载按钮
            compressedPreview.src = resizedUrl;
            const response = await fetch(resizedUrl);
            const blob = await response.blob();
            compressedSize.textContent = formatFileSize(blob.size);

            // 更新下载按钮
            downloadBtn.onclick = () => {
                const link = document.createElement('a');
                link.download = 'processed_image.png';
                link.href = resizedUrl;
                link.click();
            };

        } catch (error) {
            alert('处理失败：' + error.message);
        } finally {
            removeBgBtn.disabled = false;
            removeBgBtn.textContent = '移除背景';
        }
    });
}); 