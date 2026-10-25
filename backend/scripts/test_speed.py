import time
import joblib
import numpy as np
import scipy.sparse as sp
from concurrent.futures import ProcessPoolExecutor

def run_test():
    vec = joblib.load('backend/models/waf_vectorizer.pkl')
    sample = ["/shop/product/item-1234?search=query+string&filter=all" for _ in range(50000)]
    
    t0 = time.time()
    X1 = vec.transform(sample)
    t1 = time.time()
    print(f"Single core 50k: {t1 - t0:.2f}s")

if __name__ == "__main__":
    run_test()
