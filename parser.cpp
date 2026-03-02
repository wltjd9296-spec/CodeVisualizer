#include <string>

extern "C" {
    // 코드의 최대 중첩 깊이(괄호 { } 기준)를 계산하는 C++ 함수
    // 중첩이 깊을수록 코드가 복잡하다는 뜻입니다.
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
}
