# MDefender Pro - Package Publishing Guide

This guide explains how to publish MDefender Pro packages to npm, PyPI, and Composer.

## Prerequisites

Before publishing, you need accounts on:
- **npm**: https://www.npmjs.com/signup
- **PyPI**: https://pypi.org/account/register/
- **Composer/Packagist**: https://packagist.org/

---

## 1. NPM Package (npm install mdefender)

### Step 1: Login to npm

```bash
npm login
```

### Step 2: Navigate to package directory

```bash
cd "npm-package"
```

### Step 3: Publish

```bash
npm publish
```

### Verification

After publishing, users can install with:

```bash
npm install mdefender
```

### Package Location

- Package: https://www.npmjs.com/package/mdefender
- Files: `npm-package/`

---

## 2. Python Package (pip install mdefender)

### Step 1: Install build tools

```bash
pip install build twine
```

### Step 2: Navigate to package directory

```bash
cd "python-package"
```

### Step 3: Build the package

```bash
python -m build
```

This creates:
- `dist/mdefender-1.1.0.tar.gz` (source distribution)
- `dist/mdefender-1.1.0-py3-none-any.whl` (wheel)

### Step 4: Test on TestPyPI first (recommended)

```bash
# Upload to TestPyPI
twine upload --repository testpypi dist/*

# Test installation
pip install --index-url https://test.pypi.org/simple/ mdefender
```

### Step 5: Publish to PyPI

```bash
twine upload dist/*
```

### Verification

After publishing, users can install with:

```bash
pip install mdefender
```

### Package Location

- Package: https://pypi.org/project/mdefender/
- Files: `python-package/`

---

## 3. PHP Package (composer require mdefender/mdefender)

### Step 1: Create Packagist account

1. Go to https://packagist.org/
2. Click "Create" and sign in with GitHub
3. Click "Submit" to submit a package

### Step 2: Initialize Git repository

```bash
cd "php-package"
git init
git add .
git commit -m "Initial release v1.1.0"
```

### Step 3: Push to GitHub

```bash
git remote add origin https://github.com/mdefender/mdefender-php.git
git push -u origin main
```

### Step 4: Submit to Packagist

1. Go to https://packagist.org/packages/submit
2. Enter your GitHub repository URL: `https://github.com/mdefender/mdefender-php`
3. Click "Check"
4. Click "Submit"

### Step 5: Set up webhook (for auto-updates)

1. Go to your package page on Packagist
2. Click "Auto-update"
3. Add webhook to your GitHub repo:
   - URL: `https://packagist.org/api/update-package?repoType=github&repoVendor=mdefender`
   - Content type: `application/json`
   - Secret: (generate from Packagist settings)
   - Events: Just the push event

### Verification

After publishing, users can install with:

```bash
composer require mdefender/mdefender
```

### Package Location

- Package: https://packagist.org/packages/mdefender/mdefender
- Files: `php-package/`

---

## Package URLs Summary

| Package | Install Command | URL |
|---------|----------------|-----|
| npm | `npm install mdefender` | https://www.npmjs.com/package/mdefender |
| PyPI | `pip install mdefender` | https://pypi.org/project/mdefender/ |
| Composer | `composer require mdefender/mdefender` | https://packagist.org/packages/mdefender/mdefender |

---

## API Endpoint

All packages default to:
- **API Server**: `https://mdefender-pro.onrender.com`
- **Dashboard**: `https://mdefender-pro-6e3r.onrender.com`

Users need to register at the dashboard to get their API key.

---

## Version Management

When updating packages:

1. Update version in `npm-package/package.json`
2. Update version in `python-package/setup.py` and `python-package/mdefender/__init__.py`
3. Update version in `php-package/composer.json`
4. Re-publish all packages

---

## Testing Packages Locally

### npm (local)

```bash
cd npm-package
npm pack
# This creates mdefender-1.1.0.tgz
# Test in another project:
npm install /path/to/mdefender-1.1.0.tgz
```

### Python (local)

```bash
cd python-package
pip install -e .
# Or build and install wheel:
python -m build
pip install dist/mdefender-1.1.0-py3-none-any.whl
```

### PHP (local)

```bash
cd php-package
composer install
# Or in another project:
composer require /path/to/php-package
```

---

## Troubleshooting

### npm publish fails

- Ensure you're logged in: `npm whoami`
- Check package name isn't taken: `npm view mdefender`

### Python upload fails

- Ensure twine is installed: `pip install twine`
- Check PyPI credentials
- Verify package builds: `python -m build`

### Packagist not updating

- Check webhook is configured
- Ensure GitHub repo is public
- Manually update: Go to package page, click "Force Update"

---

## Support

- Dashboard: https://mdefender-pro-6e3r.onrender.com
- API: https://mdefender-pro.onrender.com
- GitHub: https://github.com/mdefender/mdefender
