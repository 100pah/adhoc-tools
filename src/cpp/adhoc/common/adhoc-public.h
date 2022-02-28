/// -----------------------------------------
/// Should make usre compiled by C compiler.
/// -----------------------------------------

#ifndef _ADHOC_TOOLS_PUBLIC_H_
#define _ADHOC_TOOLS_PUBLIC_H_

#ifdef __cplusplus
#define _ADHOC_TOOLS_EXPORT_ extern "C" __attribute__((visibility("default"))) __attribute__((used))
#else
#define _ADHOC_TOOLS_EXPORT_
#endif

#endif // end of _ADHOC_TOOLS_PUBLIC_H_