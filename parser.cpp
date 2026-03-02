#ifdef __cplusplus
extern "C" {
#endif

// 코드의 최대 중첩 깊이(괄호 { } 기준)를 계산하는 순수 함수
int analyzeDepth(const char* code) {
    int maxDepth = 0;
    int currentDepth = 0;
    
    for (int i = 0; code[i] != '\0'; i++) {
        if (code[i] == '{') {
            currentDepth++;
            if (currentDepth > maxDepth) {
                maxDepth = currentDepth;
            }
        } else if (code[i] == '}') {
            currentDepth--;
            if (currentDepth < 0) {
                currentDepth = 0;
            }
        }
    }
    return maxDepth;
}

#ifdef __cplusplus
}
#endif
