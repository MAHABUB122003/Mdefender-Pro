from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

setup(
    name="mdefender",
    version="1.1.0",
    author="MDefender Pro",
    author_email="support@mdefender.com",
    description="MDefender Pro - Web Application Firewall client for Python (Flask, Django, WSGI)",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/mdefender/mdefender",
    project_urls={
        "Homepage": "https://mdefender-pro-6e3r.onrender.com",
        "Documentation": "https://mdefender-pro-6e3r.onrender.com/docs",
        "Bug Tracker": "https://github.com/mdefender/mdefender/issues",
    },
    packages=find_packages(),
    classifiers=[
        "Development Status :: 5 - Production/Stable",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.7",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
        "Topic :: Internet :: WWW/HTTP :: HTTP Servers",
        "Topic :: Security",
        "Topic :: Software Development :: Libraries :: Python Modules",
    ],
    python_requires=">=3.7",
    keywords="waf web-application-firewall security firewall xss sqli csrf protection flask django",
    license="MIT",
)
