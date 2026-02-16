import { NextResponse } from "next/server";

export type ApiSuccessResponse<T> = {
  success: true;
  message?: string;
  data?: T;
};

export type ApiErrorResponse = {
  success: false;
  message: string;
  error?: string;
};

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export function successResponse<T>(
  data?: T,
  message = "Success",
  status = 200
) {
  return NextResponse.json<ApiSuccessResponse<T>>(
    {
      success: true,
      message,
      data,
    },
    { status }
  );
}

// export function errorResponse(error?: string, status = 500, message: string) {
//   return NextResponse.json<ApiErrorResponse>(
//     {
//       success: false,
//       message,
//       error,
//     },
//     { status }
//   );
// }

// export function handleApiError(err: unknown) {
//   if (err instanceof Error) {
//     return errorResponse(err.message, 400);
//   }

//   return errorResponse({message:"Internal Server Error", status:500});
// }
